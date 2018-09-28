export class FullyQualifiedNameStore {
  private fqns: Set<string> = new Set()
  public add(namespace: string, name: string): void {
    this.fqns.add(`${namespace}.${name}`)
  }
  public get(name: string): string {
    if (this.fqns.has(name)) {
      return name
    }
    const arr = Array.from(this.fqns)
    const matching = arr.filter((fqn) => {
      const segments = fqn.split('.')
      return segments[segments.length - 1] === name
    })
    switch (matching.length) {
      case 0:
        return null
      case 1:
        return matching[0]
      default:
        throw new TypeError(`Multiple identical fqns for ${name}: ${matching.join(', ')}`)
    }
  }
}
