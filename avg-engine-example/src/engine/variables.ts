/**
 * AVG Engine - 变量系统
 * 管理好感度、旗标、计数器等游戏变量
 */

export class VariableSystem {
  private variables: Map<string, number | string | boolean> = new Map();
  private flags: Set<string> = new Set();

  /** 获取变量 */
  get(name: string): number | string | boolean | undefined {
    return this.variables.get(name);
  }

  /** 设置变量 */
  set(name: string, value: number | string | boolean, op?: '=' | '+=' | '-='): void {
    if (op === '+=' || op === '-=') {
      const current = Number(this.variables.get(name)) || 0;
      const delta = Number(value);
      this.variables.set(name, op === '+=' ? current + delta : current - delta);
    } else {
      this.variables.set(name, value);
    }
  }

  /** 设置旗标 */
  setFlag(name: string): void {
    this.flags.add(name);
  }

  /** 清除旗标 */
  clearFlag(name: string): void {
    this.flags.delete(name);
  }

  /** 检查旗标 */
  hasFlag(name: string): boolean {
    return this.flags.has(name);
  }

  /** 评估条件表达式 */
  evaluate(condition: string): boolean {
    try {
      // 支持: flag.xxx, var >= N, var == N, var <= N, !expr, expr && expr, expr || expr
      let expr = condition.trim();

      // 处理 flag.xxx
      expr = expr.replace(/flag\.(\w+)/g, (_, name) => this.flags.has(name) ? 'true' : 'false');

      // 处理变量引用: $xxx 或直接变量名
      expr = expr.replace(/\$?(\w+)\s*(>=|<=|!=|==|>|<)\s*(\S+)/g, (_, varName, op, val) => {
        const varValue = this.variables.get(varName);
        const numVal = Number(varValue);
        const cmpVal = Number(val);
        if (!isNaN(numVal) && !isNaN(cmpVal)) {
          switch (op) {
            case '>=': return numVal >= cmpVal ? 'true' : 'false';
            case '<=': return numVal <= cmpVal ? 'true' : 'false';
            case '>': return numVal > cmpVal ? 'true' : 'false';
            case '<': return numVal < cmpVal ? 'true' : 'false';
            case '==': return numVal === cmpVal ? 'true' : 'false';
            case '!=': return numVal !== cmpVal ? 'true' : 'false';
          }
        }
        // 字符串比较
        if (op === '==') return String(varValue) === val ? 'true' : 'false';
        if (op === '!=') return String(varValue) !== val ? 'true' : 'false';
        return 'false';
      });

      // 安全的布尔求值
      // 只允许 true/false/&&/||/!/括号
      const safeExpr = expr.replace(/[^truefalsed&|!()\s]/g, '');
      // eslint-disable-next-line no-new-func
      return new Function(`return !!(${safeExpr || 'false'})`)();
    } catch {
      return false;
    }
  }

  /** 导出状态 */
  export(): Record<string, number | string | boolean> {
    return Object.fromEntries(this.variables);
  }

  /** 导出旗标 */
  exportFlags(): string[] {
    return Array.from(this.flags);
  }

  /** 导入状态 */
  import(vars: Record<string, number | string | boolean>, flags: string[]): void {
    this.variables = new Map(Object.entries(vars));
    this.flags = new Set(flags);
  }

  /** 重置 */
  reset(): void {
    this.variables.clear();
    this.flags.clear();
  }
}
