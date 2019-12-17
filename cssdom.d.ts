declare interface CssDomCharset {
	readonly type: 'charset';
	readonly value: string;
}

declare interface CssDomImport {
	readonly type: 'import';
	readonly value: string;
}

declare interface CssDomRule {
	readonly type: 'rule';
	readonly selectors: readonly string[];
	readonly declarations: {
		readonly [ key: string ]: string;
	};
}

declare interface CssDomKeyframes {
	readonly type: 'keyframes';
	readonly vendor: string|void;
	readonly value: string;
	readonly rules: readonly CssDomRule[];
}

declare interface CssDomDocument {
	readonly type: 'document';
	readonly vendor: string|void;
	readonly value: string;
	readonly rules: readonly CssDomRule[];
}

declare interface CssDomMedia {
	readonly type: 'media';
	readonly value: string;
	readonly rules: readonly CssDomRule[];
}

declare interface CssDomSupports {
	readonly type: 'supports';
	readonly value: string;
	readonly rules: readonly CssDomRule[];
}

declare interface CssDomComment {
	readonly type: 'comment';
	readonly value: string;
}

declare type CssDomNode = CssDomCharset|CssDomImport|CssDomRule|CssDomKeyframes|CssDomDocument|CssDomMedia|CssDomSupports|CssDomComment;

declare interface CssDomCss {
	readonly [ key: string ]: string;
}

declare interface CssDomChange {
	readonly [ key: string ]: string|( ( value: string, rule: CssDomRule ) => string );
}

declare interface CssDomBeautifyOptions {
	readonly indent?: string;
	readonly separateRule?: boolean;
}

declare class CssDom {
	public dom: CssDomNode[];
	public constructor( str: string );
	public css( dom: CssDomNode, css: CssDomChange ): void;
	public selector( selector: string, css?: void ): readonly CssDomRule[];
	public selector( selector: string, css: CssDomChange ): void;
	public property( property: string, css?: void ): readonly CssDomRule[];
	public property( property: string, css: CssDomChange ): void;
	public unshift( dom: CssDomNode|readonly CssDomNode[] ): void;
	public push( dom: CssDomNode|readonly CssDomNode[] ): void;
	public validateDom( dom: CssDomNode|readonly CssDomNode[] ): readonly CssDomNode[];
	public stringify(): string;
	public beautify( options?: CssDomBeautifyOptions ): string;
}

export = CssDom;
export as namespace CssDom;
