// Unește clasele CSS, sărind peste cele goale: cn('a', cond && 'b') -> 'a b' sau 'a'
export const cn = (...classes) => classes.filter(Boolean).join(' ')
