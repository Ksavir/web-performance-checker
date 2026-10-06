/** Une clases CSS y descarta las condiciones falsas: cn('cell', isNum && 'num'). */
export const cn = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');
