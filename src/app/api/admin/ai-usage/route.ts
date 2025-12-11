import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkIsSuperAdmin } from '@/lib/auth/check-super-admin';

interface UseCaseStats {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  avgResponseTime: number;
  totalResponseTime: number;
}

interface ModelStats {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

interface DailyStats {
  calls: number;
  tokens: number;
  cost: number;
}

/**
 * GET /api/admin/ai-usage
 * Statistiche di utilizzo AI - Solo super_admin
 * Query params: period=day|week|month|all
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Verifica autenticazione
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Non autorizzato' }, { status: 401 });
    }

    // Verifica super_admin
    const isSuperAdmin = await checkIsSuperAdmin(supabase, user.email);
    if (!isSuperAdmin) {
      return NextResponse.json({ success: false, error: 'Accesso negato' }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    // Calcola date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'all':
        startDate = new Date(0); // Inizio tempo
        break;
      default:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
    }

    // Query per statistiche aggregate
    const { data: usageLogs, error } = await supabase
      .from('AiUsageLog')
      .select('*')
      .gte('createdAt', startDate.toISOString())
      .order('createdAt', { ascending: false });

    if (error) {
      console.error('Error fetching usage logs:', error);
      return NextResponse.json(
        { success: false, error: 'Errore nel recupero dei dati' },
        { status: 500 }
      );
    }

    // Calcola statistiche
    const logs = usageLogs || [];

    // Totali
    const totalCalls = logs.length;
    const totalInputTokens = logs.reduce((sum, log) => sum + (log.inputTokens || 0), 0);
    const totalOutputTokens = logs.reduce((sum, log) => sum + (log.outputTokens || 0), 0);
    const totalTokens = totalInputTokens + totalOutputTokens;
    const totalCost = logs.reduce((sum, log) => sum + parseFloat(log.costUsd || '0'), 0);
    const avgResponseTime = logs.length > 0
      ? logs.reduce((sum, log) => sum + (log.responseTimeMs || 0), 0) / logs.length
      : 0;
    const successRate = logs.length > 0
      ? (logs.filter(log => log.success).length / logs.length) * 100
      : 100;

    // Statistiche per use case
    const byUseCaseMap: Record<string, UseCaseStats> = {};
    logs.forEach(log => {
      const useCase = log.useCase || 'unknown';
      if (!byUseCaseMap[useCase]) {
        byUseCaseMap[useCase] = {
          calls: 0,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
          avgResponseTime: 0,
          totalResponseTime: 0,
        };
      }
      byUseCaseMap[useCase].calls++;
      byUseCaseMap[useCase].inputTokens += log.inputTokens || 0;
      byUseCaseMap[useCase].outputTokens += log.outputTokens || 0;
      byUseCaseMap[useCase].cost += parseFloat(log.costUsd || '0');
      byUseCaseMap[useCase].totalResponseTime += log.responseTimeMs || 0;
    });

    // Calcola media response time per use case
    Object.keys(byUseCaseMap).forEach(key => {
      byUseCaseMap[key].avgResponseTime = byUseCaseMap[key].calls > 0
        ? byUseCaseMap[key].totalResponseTime / byUseCaseMap[key].calls
        : 0;
    });

    // Statistiche per modello
    const byModelMap: Record<string, ModelStats> = {};
    logs.forEach(log => {
      const model = log.modelId || 'unknown';
      if (!byModelMap[model]) {
        byModelMap[model] = {
          calls: 0,
          inputTokens: 0,
          outputTokens: 0,
          cost: 0,
        };
      }
      byModelMap[model].calls++;
      byModelMap[model].inputTokens += log.inputTokens || 0;
      byModelMap[model].outputTokens += log.outputTokens || 0;
      byModelMap[model].cost += parseFloat(log.costUsd || '0');
    });

    // Statistiche per giorno (ultimi 30 giorni)
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const dailyStatsMap: Record<string, DailyStats> = {};
    logs
      .filter(log => new Date(log.createdAt) >= last30Days)
      .forEach(log => {
        const date = new Date(log.createdAt).toISOString().split('T')[0];
        if (!dailyStatsMap[date]) {
          dailyStatsMap[date] = { calls: 0, tokens: 0, cost: 0 };
        }
        dailyStatsMap[date].calls++;
        dailyStatsMap[date].tokens += (log.inputTokens || 0) + (log.outputTokens || 0);
        dailyStatsMap[date].cost += parseFloat(log.costUsd || '0');
      });

    // Converti in array ordinati
    const byUseCase = Object.entries(byUseCaseMap).map(([useCase, stats]) => ({
      useCase,
      calls: stats.calls,
      inputTokens: stats.inputTokens,
      outputTokens: stats.outputTokens,
      cost: Number(stats.cost.toFixed(4)),
      avgResponseTime: Math.round(stats.avgResponseTime),
    }));

    const byModel = Object.entries(byModelMap).map(([model, stats]) => ({
      model,
      calls: stats.calls,
      inputTokens: stats.inputTokens,
      outputTokens: stats.outputTokens,
      cost: Number(stats.cost.toFixed(4)),
    }));

    const dailyStats = Object.entries(dailyStatsMap)
      .map(([date, stats]) => ({
        date,
        calls: stats.calls,
        tokens: stats.tokens,
        cost: Number(stats.cost.toFixed(4)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      period,
      summary: {
        totalCalls,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        totalCost: Number(totalCost.toFixed(4)),
        avgResponseTime: Math.round(avgResponseTime),
        successRate: Number(successRate.toFixed(1)),
      },
      byUseCase,
      byModel,
      dailyStats,
      recentLogs: logs.slice(0, 50).map(log => ({
        id: log.id,
        useCase: log.useCase,
        modelId: log.modelId,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        costUsd: log.costUsd,
        responseTimeMs: log.responseTimeMs,
        success: log.success,
        createdAt: log.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error in AI usage API:', error);
    return NextResponse.json(
      { success: false, error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
