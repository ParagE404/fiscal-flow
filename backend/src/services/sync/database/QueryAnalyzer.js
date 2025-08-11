/**
 * Query analyzer for monitoring and optimizing database performance
 * Provides query performance metrics and optimization suggestions
 */

class QueryAnalyzer {
  constructor(prisma) {
    this.prisma = prisma;
    this.queryStats = new Map();
    this.slowQueryThreshold = 1000; // 1 second
    this.isMonitoring = false;
  }

  /**
   * Start monitoring database queries
   */
  startMonitoring() {
    if (this.isMonitoring) {
      return;
    }

    // Enable query logging in development
    if (process.env.NODE_ENV === 'development') {
      this.prisma.$on('query', (e) => {
        this.recordQuery(e);
      });
    }

    this.isMonitoring = true;
    console.log('Query analyzer monitoring started');
  }

  /**
   * Record query execution for analysis
   */
  recordQuery(queryEvent) {
    const { query, params, duration, target } = queryEvent;
    const queryHash = this.hashQuery(query);
    
    if (!this.queryStats.has(queryHash)) {
      this.queryStats.set(queryHash, {
        query: this.sanitizeQuery(query),
        target,
        executions: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        slowExecutions: 0,
        lastExecuted: null
      });
    }

    const stats = this.queryStats.get(queryHash);
    stats.executions++;
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.executions;
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.lastExecuted = new Date();

    if (duration > this.slowQueryThreshold) {
      stats.slowExecutions++;
      console.warn(`Slow query detected (${duration}ms):`, this.sanitizeQuery(query));
    }
  }

  /**
   * Get query performance statistics
   */
  getQueryStats() {
    const stats = Array.from(this.queryStats.values())
      .sort((a, b) => b.totalDuration - a.totalDuration);

    return {
      totalQueries: stats.reduce((sum, stat) => sum + stat.executions, 0),
      uniqueQueries: stats.length,
      totalDuration: stats.reduce((sum, stat) => sum + stat.totalDuration, 0),
      slowQueries: stats.filter(stat => stat.slowExecutions > 0).length,
      topSlowQueries: stats
        .filter(stat => stat.slowExecutions > 0)
        .slice(0, 10),
      mostExecutedQueries: stats
        .sort((a, b) => b.executions - a.executions)
        .slice(0, 10),
      avgQueryDuration: stats.length > 0 ? 
        stats.reduce((sum, stat) => sum + stat.avgDuration, 0) / stats.length : 0
    };
  }

  /**
   * Analyze sync-specific query patterns
   */
  async analyzeSyncQueries() {
    const analysis = {
      indexUsage: await this.analyzeIndexUsage(),
      tableStats: await this.getTableStatistics(),
      syncQueryPatterns: this.analyzeSyncPatterns(),
      recommendations: []
    };

    // Generate recommendations based on analysis
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * Analyze index usage for sync-related tables
   */
  async analyzeIndexUsage() {
    try {
      // PostgreSQL specific query to analyze index usage
      const indexUsage = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_scan
        FROM pg_stat_user_indexes 
        WHERE tablename IN ('sync_metadata', 'sync_configurations', 'mutual_funds', 'stocks', 'epf_accounts')
        ORDER BY idx_scan DESC;
      `;

      return indexUsage;
    } catch (error) {
      console.warn('Index usage analysis failed:', error.message);
      return [];
    }
  }

  /**
   * Get table statistics for sync-related tables
   */
  async getTableStatistics() {
    try {
      const tableStats = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables 
        WHERE tablename IN ('sync_metadata', 'sync_configurations', 'mutual_funds', 'stocks', 'epf_accounts')
        ORDER BY n_live_tup DESC;
      `;

      return tableStats;
    } catch (error) {
      console.warn('Table statistics analysis failed:', error.message);
      return [];
    }
  }

  /**
   * Analyze sync-specific query patterns
   */
  analyzeSyncPatterns() {
    const syncQueries = Array.from(this.queryStats.values())
      .filter(stat => this.isSyncRelatedQuery(stat.query));

    const patterns = {
      bulkOperations: syncQueries.filter(q => q.query.includes('IN (')).length,
      singleRecordQueries: syncQueries.filter(q => 
        q.query.includes('WHERE') && !q.query.includes('IN (')
      ).length,
      updateOperations: syncQueries.filter(q => q.query.startsWith('UPDATE')).length,
      insertOperations: syncQueries.filter(q => q.query.startsWith('INSERT')).length,
      selectOperations: syncQueries.filter(q => q.query.startsWith('SELECT')).length
    };

    return patterns;
  }

  /**
   * Check if query is sync-related
   */
  isSyncRelatedQuery(query) {
    const syncTables = ['sync_metadata', 'sync_configurations', 'mutual_funds', 'stocks', 'epf_accounts'];
    return syncTables.some(table => query.toLowerCase().includes(table));
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    // Check for slow queries
    const slowQueries = analysis.syncQueryPatterns || this.getQueryStats().topSlowQueries;
    if (slowQueries.length > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `Found ${slowQueries.length} slow sync queries. Consider adding indexes or optimizing query structure.`,
        queries: slowQueries.slice(0, 3)
      });
    }

    // Check for missing indexes
    if (analysis.indexUsage) {
      const unusedIndexes = analysis.indexUsage.filter(idx => idx.idx_scan === 0);
      if (unusedIndexes.length > 0) {
        recommendations.push({
          type: 'indexing',
          priority: 'medium',
          message: `Found ${unusedIndexes.length} unused indexes that could be dropped to improve write performance.`,
          indexes: unusedIndexes
        });
      }
    }

    // Check for table maintenance needs
    if (analysis.tableStats) {
      const needsVacuum = analysis.tableStats.filter(table => 
        table.dead_tuples > table.live_tuples * 0.1
      );
      
      if (needsVacuum.length > 0) {
        recommendations.push({
          type: 'maintenance',
          priority: 'medium',
          message: `${needsVacuum.length} tables need vacuum/analyze for optimal performance.`,
          tables: needsVacuum
        });
      }
    }

    // Check query patterns
    const stats = this.getQueryStats();
    if (stats.slowQueries > stats.totalQueries * 0.1) {
      recommendations.push({
        type: 'optimization',
        priority: 'high',
        message: 'High percentage of slow queries detected. Consider query optimization or hardware upgrade.'
      });
    }

    return recommendations;
  }

  /**
   * Get sync-specific performance metrics
   */
  getSyncPerformanceMetrics() {
    const syncStats = Array.from(this.queryStats.values())
      .filter(stat => this.isSyncRelatedQuery(stat.query));

    return {
      totalSyncQueries: syncStats.reduce((sum, stat) => sum + stat.executions, 0),
      avgSyncQueryDuration: syncStats.length > 0 ? 
        syncStats.reduce((sum, stat) => sum + stat.avgDuration, 0) / syncStats.length : 0,
      slowSyncQueries: syncStats.filter(stat => stat.slowExecutions > 0).length,
      syncQueryTypes: {
        selects: syncStats.filter(s => s.query.startsWith('SELECT')).length,
        updates: syncStats.filter(s => s.query.startsWith('UPDATE')).length,
        inserts: syncStats.filter(s => s.query.startsWith('INSERT')).length,
        deletes: syncStats.filter(s => s.query.startsWith('DELETE')).length
      }
    };
  }

  /**
   * Optimize query for better performance
   */
  optimizeQuery(originalQuery) {
    let optimizedQuery = originalQuery;
    const suggestions = [];

    // Check for missing WHERE clauses on large tables
    if (optimizedQuery.includes('FROM sync_metadata') && !optimizedQuery.includes('WHERE')) {
      suggestions.push('Add WHERE clause to filter sync_metadata by user_id');
    }

    // Check for SELECT * usage
    if (optimizedQuery.includes('SELECT *')) {
      suggestions.push('Replace SELECT * with specific column names');
    }

    // Check for missing LIMIT on potentially large result sets
    if (optimizedQuery.includes('ORDER BY') && !optimizedQuery.includes('LIMIT')) {
      suggestions.push('Consider adding LIMIT clause for paginated results');
    }

    // Check for inefficient JOINs
    if (optimizedQuery.includes('LEFT JOIN') && optimizedQuery.includes('WHERE')) {
      suggestions.push('Consider if LEFT JOIN can be replaced with INNER JOIN');
    }

    return {
      originalQuery,
      optimizedQuery,
      suggestions
    };
  }

  /**
   * Generate hash for query identification
   */
  hashQuery(query) {
    // Simple hash function for query identification
    let hash = 0;
    const normalizedQuery = query.replace(/\$\d+/g, '?').replace(/\s+/g, ' ').trim();
    
    for (let i = 0; i < normalizedQuery.length; i++) {
      const char = normalizedQuery.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString();
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  sanitizeQuery(query) {
    return query
      .replace(/\$\d+/g, '?')
      .replace(/VALUES\s*\([^)]+\)/gi, 'VALUES (?)')
      .substring(0, 200) + (query.length > 200 ? '...' : '');
  }

  /**
   * Export query statistics for analysis
   */
  exportStats() {
    return {
      timestamp: new Date(),
      queryStats: Array.from(this.queryStats.entries()).map(([hash, stats]) => ({
        hash,
        ...stats
      })),
      summary: this.getQueryStats(),
      syncMetrics: this.getSyncPerformanceMetrics()
    };
  }

  /**
   * Clear query statistics
   */
  clearStats() {
    this.queryStats.clear();
    console.log('Query statistics cleared');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('Query analyzer monitoring stopped');
  }
}

module.exports = QueryAnalyzer;