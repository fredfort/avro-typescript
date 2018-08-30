export interface Leaf {
	value: string
}

export interface Tree {
	left?: null | undefined | Tree | Leaf
	right?: null | undefined | Tree | Leaf
}
