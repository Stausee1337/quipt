import difflib from 'difflib';
import {
    type BlockLine,
    type StyledTextSpan,
    type Page as IRPage,
    type Block as IRBlock,
    type Font,
    FontStyles,
    type UnstyledFont,
    isSameFont,
} from './pdf-ir';

export type BlockType = 'dialogue' | 'action' | 'section' | 'unknown' | 'header' | 'footer' | 'title';

export interface BaseBlockData {
    type: BlockType;
    text: string;
    formattedString: string | undefined;
    actorNames: string[] | undefined;
    // NOTE: This `lines` ends up doubling with the `lines` in `IRBlock`. These are here to make it
    // more clear, that we override theirs.
    lines: BlockLine[];
}

export interface OtherBlockData extends BaseBlockData {
    type: 'section' | 'unknown' | 'header' | 'footer' | 'title';
}

export interface ActionBlockData extends BaseBlockData {
    type: 'action';
    formattedString: string;
}

export interface DialogueBlockData extends BaseBlockData {
    type: 'dialogue';
    formattedString: string;
    actorNames: string[];
}

export type BlockData = DialogueBlockData | ActionBlockData | OtherBlockData;

export type Block = IRBlock & BlockData;

export type Page = {
    blocks: Block[];
};

function getLineText(line: BlockLine): string {
    return line.styledText
        .map(span => span.text)
        .join('')
        .trimEnd();
}

const tokenizers = {
    word: /^(\p{Lu}\p{Ll}+|\p{Ll}{2,})/u,
    punctuation: /^[!"\#\$%\&'\(\)\*\+,\-\./:;<=>\?@\[\\\]\^_`\{\|\}\~]/,
    numeric: /^\d+/,
};

type Tokenizers = typeof tokenizers;
type TokenTypeBase = keyof Tokenizers | 'eos';

type Token<Type = never> = {
    type: Type | TokenTypeBase;
    text: string;
    offset: number;
};
type BaseToken<Type> = Token<Type>;

type TokenStream<Type = never> = {
    save(): void;
    restore(): void;
    next(): Token<Type>;
};

type Punctuation =
    | '!'
    | '"'
    | '#'
    | '$'
    | '%'
    | '&'
    | "'"
    | '('
    | ')'
    | '*'
    | '+'
    | ','
    | '-'
    | '.'
    | '/'
    | ':'
    | ';'
    | '<'
    | '='
    | '>'
    | '?'
    | '@'
    | '['
    | '\\'
    | ']'
    | '^'
    | '_'
    | '`'
    | '{'
    | '|'
    | '}'
    | '~';

function isPunct<Type>(token: Token<Type>, punct: Punctuation): boolean {
    return token.type === 'punctuation' && token.text === punct;
}

function isKeyword<Type>(token: Token<Type>, keyword: string): boolean {
    return token.type === 'word' && token.text === keyword;
}

function tokenizeImpl(input: string): Token[] {
    const tokens: Token[] = [];
    const innerTokenizers = {
        ...tokenizers,
        whitespace: /^\s+/,
    };

    let offset = 0;
    while (input.length) {
        let found = false;
        for (const [name, pattern] of Object.entries(innerTokenizers)) {
            const match = input.match(pattern);
            if (match === null) continue;
            found = true;
            const matchedString = match[0];
            input = input.slice(matchedString.length);
            offset += matchedString.length;
            if (name !== 'whitespace')
                tokens.push({
                    type: name as unknown as TokenTypeBase,
                    text: matchedString,
                    offset,
                });
            break;
        }
        if (!found) break;
    }
    return tokens;
}

function tokenize<Type = never>(
    input: string,
    extendTokenKind?: (token: Token) => Token<Type>,
): TokenStream<Type> {
    let tokenOffset = 0;
    const offsetStack: number[] = [];
    const tokens = tokenizeImpl(input);

    function next(): Token<Type> {
        if (tokenOffset >= tokens.length)
            return { type: 'eos', text: '', offset: tokens.at(-1)?.offset ?? 0 };
        const token = tokens[tokenOffset++];
        return extendTokenKind ? extendTokenKind(token) : token;
    }

    let lastOffset: number | undefined = undefined;
    return {
        save() {
            offsetStack.push(tokenOffset);
        },
        restore() {
            const rv = offsetStack.pop();
            if (rv) tokenOffset = rv;
        },
        next() {
            if (lastOffset) return { type: 'eos', text: '', offset: lastOffset };
            const token = next();
            if (token.type === 'eos') lastOffset = token.offset;
            return token;
        },
    };
}

// rule DrMedSubPrefix = "dent"|"nat";
// rule DrSubPrefix = "pil"|"jur"|("-" "Ing")|("med" "." <DrMedSubPrefix>?)
// rule DrPrefix = "Dr" "." <DrSubPrefix> "."?
//
// rule DiplSubPrefix = "Ing"|"Kfm"|"Psych";
// rule Prefix = <DrPrefix>
//      |("Prof" "." <DrPrefix>?)
//      |("Dipl" "." "-"? <DiplSubPrefix> ".")
//      |("Mag" ".")
//      |("M" "." "A" ".")
//      |("M" "." "Sc" ".")
//      |("M" "." "Eng" ".")
//      |("LL" "." "M" ".");
//
// rule Name = (<Prefix>)? (<Noun>)+ <Numeric>?;
// rule Names = (<Self> ("," | "und"))? <Name>;

type NameTokenType = 'noun';

function theNameParser(stream: TokenStream<NameTokenType>): string[] {
    type Token = BaseToken<NameTokenType>;

    let currentToken: Token = stream.next();

    function advance() {
        currentToken = stream.next();
    }

    function lookahead(): Token {
        stream.save();
        const rv = stream.next();
        stream.restore();
        return rv;
    }

    function parseDrSubPrefix(): string | undefined {
        if (currentToken.text !== 'Dr') return undefined;
        if (!isPunct(lookahead(), '.')) return undefined;
        advance();
        advance();
        return 'Dr.';
    }

    function parsePrefix(): string | undefined {
        if (currentToken.text === 'Prof') {
            if (!isPunct(lookahead(), '.')) return undefined;
            advance();
            advance();
            const drSubPrefix = parseDrSubPrefix();
            return drSubPrefix ? 'Prof.' : `Prof. ${drSubPrefix}`;
        } else if (currentToken.type === 'numeric') {
            if (!isPunct(lookahead(), '.')) return undefined;
            const number = currentToken.text;
            advance();
            advance();
            return `${number}.`;
        }
        return parseDrSubPrefix();
    }

    function isLowercaseWord(token: Token): boolean {
        return token.type === 'word' && token.text !== 'und' && token.text !== 'http';
    }

    function parseName(): string | undefined {
        const prefix = parsePrefix();

        const parts: Token[] = [];
        while (currentToken.type === 'noun' || isLowercaseWord(currentToken)) {
            parts.push(currentToken);
            advance();
        }

        if (!parts.length) return undefined;
        if (
            parts.at(-1)?.type !== 'noun' &&
            !parts.some(x => x.text.match(/alle/i) !== null) &&
            !parts.some(x => x.text.match(/zusammen/i) !== null) &&
            !parts.some(x => x.text.match(/miteinander/i) !== null)
        )
            return undefined;

        if (currentToken.type === 'numeric') {
            parts.push(currentToken);
            advance();
        }

        if (prefix) return `${prefix} ${parts.map(t => t.text).join(' ')}`;
        return parts.map(t => t.text).join(' ');
    }

    function parseNames(): string[] {
        const names: string[] = [];

        while (currentToken.type !== 'eos') {
            const name = parseName();
            if (!name) return [];
            names.push(name);

            if (isPunct(currentToken, ',') || isKeyword(currentToken, 'und')) advance();
        }

        return names;
    }

    return parseNames();
}

function isCommonTheaterWord(word: string): boolean {
    const theaterWordPatterns = [
        /Alter/,
        /Anhang/,
        /Anhänge/,
        /Aufführung\p{Ll}*/u,
        /Spiel\p{Ll}*/u,
        /Bühne\p{Ll}*/u,
        /Einsatz/,
        /Einsätze/,
        /Inhalt\p{Ll}*/u,
        /Musik\p{Ll}*/u,
        /Person/,
        /Personen/,
        /Quelle/,
        /Quellen/,
        /Rolle/,
        /Rollen/,
        /Versand\p{Ll}*/u,
    ];
    return theaterWordPatterns.some(pattern => word.match(pattern) !== null);
}

function isNounString(string: string): boolean {
    return string[0] === string[0].toUpperCase();
}

type ParseNamesResult = { names: string[]; offset: number };

function parseNames(text: string): ParseNamesResult | undefined {
    if (!text.includes(':')) return undefined;
    let hitColon = false;
    let lastToken: Token | undefined;
    const stream = tokenize<NameTokenType>(text, token => {
        lastToken = token;
        if (token.type === 'word' && isNounString(token.text)) return { ...token, type: 'noun' };
        else if (isPunct(token, ':')) {
            hitColon = true;
            return { ...token, type: 'eos' };
        }
        return token;
    });
    
    const names = theNameParser(stream).filter(name => !isCommonTheaterWord(name));
    if (!hitColon) return undefined;
    if (!names.length) return undefined;
    return { names, offset: lastToken?.offset ?? 0 };
}

// rule ActOrScene = "Akt"|"Szene";
// rule PrefixSection = <Numeric> "." <ActOrScene>;
// rule SuffixSection = <ActOrScene> <Numeric>;
// rule Section = PrefixSection|SuffixSection;

function theSectionParser(stream: TokenStream): boolean {
    function advance(): Token {
        return stream.next();
    }

    function isActOrScene(token: Token): boolean {
        return token.type === 'word' && (token.text === 'Akt' || token.text === 'Szene');
    }

    function parsePrefixSection(currentToken: Token): boolean {
        if (!isPunct(currentToken, '.')) return false;
        return isActOrScene(advance());
    }

    function parseSuffixSection(currentToken: Token): boolean {
        return currentToken.type === 'numeric';
    }

    function parseSection(currentToken: Token): boolean {
        if (currentToken.type === 'numeric') return parsePrefixSection(advance());
        else if (isActOrScene(currentToken)) return parseSuffixSection(advance());
        return false;
    }

    return parseSection(advance());
}

function matchSection(text: string): boolean {
    if (!text.match(/Akt|Szene/)) return false;
    const stream = tokenize(text);
    let token: Token;
    do {
        stream.save();
        if (theSectionParser(stream)) return true;
        stream.restore();
        token = stream.next();
    } while (token.type !== 'eos');
    return false;
}

function getNameFont(name: string, spans: StyledTextSpan[]): Font | undefined {
    return spans.find(span => span.text.includes(name))?.font;
}

function checkIllSeparatedNames(name: string): string[] | undefined {
    if (!name.includes(' ')) return undefined;

    const illSeparatedNames = name.split(' ');
    return illSeparatedNames.every(name => isNounString(name)) ? illSeparatedNames : undefined;
}

function parseDialogActors(text: string, likelyNames: Set<string>): ParseNamesResult | undefined {
    const parseResult = parseNames(text);
    if (!parseResult) return undefined;
    const { names, offset } = parseResult;

    const illSeparatedNames = names.length === 1 ? checkIllSeparatedNames(names[0]) : undefined;
    if (illSeparatedNames && illSeparatedNames.every(name => likelyNames.has(name)))
        return { names: illSeparatedNames, offset };
    return names.every(name => likelyNames.has(name)) ? { names, offset } : undefined;
}

type SpanStyleRatios = {
    bold: number;
    normal: number;
    italic: number;
};

function computeSpanStyleRatios(lines: BlockLine[]): SpanStyleRatios {
    let total = 0;
    let bold = 0;
    let normal = 0;
    let italic = 0;
    for (let span of Iterator.from(lines).flatMap(line => line.styledText)) {
        if (span.font.style & FontStyles.Bold) bold += span.text.length;
        if (span.font.style & FontStyles.Italic) italic += span.text.length;
        if (!(span.font.style & (FontStyles.Italic | FontStyles.Bold))) normal += span.text.length;
        total += span.text.length;
    }
    return {
        bold: bold / total,
        normal: normal / total,
        italic: italic / total,
    };
}

function getStyledBlockText(lines: BlockLine[]): StyledTextSpan[] {
    return lines.flatMap(line =>
        line.styledText.length
            ? [
                  ...line.styledText.slice(0, -1),
                  {
                      font: line.styledText.at(-1)!.font,
                      text: line.styledText.at(-1)!.text + '\n',
                  },
              ]
            : [],
    );
}

function sliceStyledText(styledText: StyledTextSpan[], start: number): StyledTextSpan[] {
    const styledTextIter = Iterator.from(styledText);

    const slicedText: StyledTextSpan[] = [];
    let offset = 0;
    for (let span of styledTextIter) {
        const currentText = span.text;
        if (offset + currentText.length < start) {
            offset += currentText.length;
            continue;
        }
        slicedText.push({
            text: currentText.slice(start - offset),
            font: span.font,
        });
        break;
    }

    slicedText.push(...styledTextIter);
    return slicedText;
}

function escapeBBCode(code: string): string {
    return code.split(/(?=\[)/).reduce((prev, next) => prev + '[' + next);
}

type SimpleStyledTextSpan = { styles: FontStyles; text: string };

function trimOneSpace(string: string): string {
    return string.replace(/^\s+(?=\S)/, ' ').replace(/(?<=\S)\s+$/, ' ');
}

type FontStyle = 'bold' | 'italic';

function contains(target: FontStyles, format: FontStyle): boolean {
    const converted = format === 'bold' ? FontStyles.Bold : FontStyles.Italic;
    return (target & converted) !== 0;
}

function computeLongestPrefix(openStyles: FontStyle[], target: FontStyles): FontStyle[] {
    const longest: FontStyle[] = [];
    for (let format of openStyles) {
        if (!contains(target, format)) break;
        longest.push(format);
    }
    return longest;
}

function emitOpeningTag(output: string[], style: FontStyle) {
    switch (style) {
        case 'bold':
            output.push('[b]');
            break;
        case 'italic':
            output.push('[i]');
            break;
    }
}

function emitClosingTag(output: string[], style: FontStyle) {
    switch (style) {
        case 'bold':
            output.push('[/b]');
            break;
        case 'italic':
            output.push('[/i]');
            break;
    }
}

function convertToFormattedStringSimple(simpleSpans: SimpleStyledTextSpan[]): string {
    let openStyles: FontStyle[] = [];
    const output: string[] = [];

    for (let span of simpleSpans) {
        const target = span.styles;
        const longest = computeLongestPrefix(openStyles, target);

        for (let style of openStyles.slice(longest.length).reverse()) emitClosingTag(output, style);

        openStyles.length = longest.length;
        for (let style of ['bold', 'italic'] as const) {
            if (contains(target, style) && !longest.includes(style)) {
                emitOpeningTag(output, style);
                openStyles.push(style);
            }
        }

        output.push(escapeBBCode(span.text));
    }

    for (let style of openStyles.reverse()) {
        emitClosingTag(output, style);
    }
    return output.join('');
}

function convertToFormattedString(styledText: StyledTextSpan[]): string {
    const simpleSpans = styledText.reduce<SimpleStyledTextSpan[]>((previous, current) => {
        const last = previous.at(-1);
        const text = trimOneSpace(current.text);
        if (!text.trim().length) return previous;
        if (last?.styles !== current.font.style)
            return [...previous, { styles: current.font.style, text }];
        return [
            ...previous.slice(0, -1),
            {
                styles: last.styles,
                text: trimOneSpace(last.text) + text,
            },
        ];
    }, []);

    return convertToFormattedStringSimple(simpleSpans);
}

function makeBlockData(line: BlockLine, likelyNames: Set<string>): BlockData {
    const lineText = getLineText(line);
    const parseResult = parseDialogActors(lineText, likelyNames);
    if (parseResult)
        return {
            type: 'dialogue',
            text: lineText,
            lines: [line],
            actorNames: parseResult.names,
            formattedString: parseResult.offset as unknown as string,
        };
    const font = line.styledText
        .map(span => span.font)
        .reduce((previousSpan, currentSpan) => ({
            family: currentSpan.family,
            size: currentSpan.size,
            style:
                Number(previousSpan.size === currentSpan.size) &&
                previousSpan.style & currentSpan.style,
        }));

    if (font.style & FontStyles.Bold && matchSection(lineText))
        return {
            type: 'section',
            text: lineText,
            lines: [line],
            actorNames: undefined,
            formattedString: undefined,
        };
    return {
        type: 'unknown',
        text: lineText,
        lines: [line],
        actorNames: undefined,
        formattedString: undefined,
    };
}

function joinTypes(currentType: BlockType, lineType: BlockType): boolean {
    if (currentType === 'action' && lineType === 'action') return true;
    if (currentType === 'dialogue' && lineType === 'action') return true;
    if (currentType === 'dialogue' && lineType === 'unknown') return true;
    if (currentType === 'unknown' && lineType === 'unknown') return true;
    return false;
}

function addMoreMetadata(blockData: BlockData): BlockData {
    if (blockData.type === 'dialogue' && typeof blockData.formattedString === 'number') {
        const formattedString = convertToFormattedString(
            sliceStyledText(
                getStyledBlockText(blockData.lines),
                blockData.formattedString as number,
            ),
        );
        return {
            ...blockData,
            formattedString,
        };
    } else if (blockData.type === 'unknown') {
        const ratios = computeSpanStyleRatios(blockData.lines);
        return ratios.italic >= 0.5
            ? {
                  ...blockData,
                  type: 'action',
                  formattedString: convertToFormattedString(getStyledBlockText(blockData.lines)),
              }
            : blockData;
    }
    return blockData;
}

function combineBlocks(
    prevBlockData: BlockData | undefined,
    newBlockData: BlockData,
): BlockData[] {
    if (prevBlockData === undefined) return [newBlockData];

    if (!joinTypes(prevBlockData.type, newBlockData.type)) return [prevBlockData, newBlockData];

    return [
        {
            ...prevBlockData,
            text: prevBlockData.text + '\n' + newBlockData.text,
            lines: [...prevBlockData.lines, ...newBlockData.lines],
        },
    ];
}

const ADDED_SPACE = 0;

function analyzeBlock(block: IRBlock, likelyNames: Set<string>): Block[] {
    function reduceStep(blocks: BlockData[], line: BlockLine): BlockData[] {
        const previousBlock = blocks.at(-1);
        const currentBlock = makeBlockData(line, likelyNames);
        return [...blocks.slice(0, -1), ...combineBlocks(previousBlock, currentBlock)];
    }

    const blocks = block.lines
        .reduce(reduceStep, [])
        .map(addMoreMetadata)
        .map(({ ...blockData }) => ({
            ...block,
            verticalDistance: ADDED_SPACE,
            ...blockData,
        }));

    blocks[0].verticalDistance = block.verticalDistance;
    return blocks;
}

function analyzePage(page: IRPage, likelyNames: Set<string>): Page {
    const blocks = page.blocks.flatMap(block => analyzeBlock(block, likelyNames));
    return { blocks };
}

function conversionPass(pages: IRPage[], likelyNames: Set<string>): Page[] {
    return pages.map(page => analyzePage(page, likelyNames));
}

function similarity(a: string, b: string): number {
    const matcher = new difflib.SequenceMatcher(null, a, b);
    return matcher.ratio();
}

type Cluster = {
    representative: string;
    items: string[];
};

const THRESHOLD = 0.95;

function getMostSimilarStringTemplateByGreedyClustering(strings: string[]): string | undefined {
    const clusters: Cluster[] = [];

    for (let x of strings) {
        let best_cluster = undefined;
        let best_similarity = 0;

        for (let cluster of clusters) {
            const s = similarity(x, cluster.representative);

            if (s > best_similarity) {
                best_similarity = s;
                best_cluster = cluster;
            }
        }

        if (best_similarity >= THRESHOLD) best_cluster!.items.push(x);
        else clusters.push({ representative: x, items: [] });
    }

    let maxCluster: Cluster | undefined;
    for (let cluster of clusters) {
        if (cluster.items.length > (maxCluster?.items?.length ?? 0)) maxCluster = cluster;
    }
    return maxCluster?.representative;
}

type DecorationTemplate = {
    text: string;
    font: UnstyledFont | undefined;
};

function headerMatchAndConvert(templates: DecorationTemplate[], page: Page) {
    const matches =
        templates.length > 0 &&
        templates.every((template, idx) => {
            const block = page.blocks[idx];
            const blockText = block.text;
            return (
                isSameFont(block.font, template.font) &&
                similarity(blockText, template.text) >= THRESHOLD
            );
        });

    if (!matches) return;

    for (let blockIdx = 0; blockIdx < templates.length; blockIdx++)
        page.blocks[blockIdx].type = 'header';
}

function footerMatchAndConvert(templates: DecorationTemplate[], page: Page) {
    const matches =
        templates.length > 0 &&
        templates.every((template, idx) => {
            const block = page.blocks.at(-(idx + 1))!;
            const blockText = block.text;
            return (
                isSameFont(block.font, template.font) &&
                similarity(blockText, template.text) >= THRESHOLD
            );
        });

    if (!matches) return;

    for (let blockIdx = 0; blockIdx < templates.length; blockIdx++)
        page.blocks.at(-(blockIdx + 1))!.type = 'footer';
}

function getTemplatesWithCallback(
    pages: Page[],
    accessPage: (page: Page, idx: number) => Block | undefined,
): DecorationTemplate[] {
    let decorationBlockCount = 0;
    const threshold = Math.floor(pages.length * 0.95);

    while (true) {
        const unknownFirstBlocks = pages.filter(
            page => accessPage(page, decorationBlockCount)?.type === 'unknown',
        ).length;
        if (unknownFirstBlocks < threshold) break;
        decorationBlockCount++;
    }

    if (!decorationBlockCount) return [];

    const templates: DecorationTemplate[] = [];
    for (let decorationBlock = 0; decorationBlock < decorationBlockCount; decorationBlock++) {
        const texts: string[] = [];
        const fonts: (UnstyledFont | undefined)[] = [];
        for (let page of pages) {
            const block = accessPage(page, decorationBlock)!;
            texts.push(block.text);
            fonts.push(block.font);
        }
        const templateString = getMostSimilarStringTemplateByGreedyClustering(texts);
        if (!templateString) break;
        const index = texts.indexOf(templateString);
        templates.push({
            text: templateString,
            font: fonts[index],
        });
    }

    return templates;
}

function decorationPass(pages: Page[]) {
    if (pages.length < 2) return;

    const headerTemplates = getTemplatesWithCallback(pages, (page, idx) => page.blocks[idx]);
    const footerTemplates = getTemplatesWithCallback(pages, (page, idx) =>
        page.blocks.at(-(idx + 1))!,
    );

    for (const page of pages) {
        headerMatchAndConvert(headerTemplates, page);
        footerMatchAndConvert(footerTemplates, page);
    }
}

function couldBeDialogContinuation(previousBlock: Block, block: Block): boolean {
    if (
        block.type !== 'unknown' ||
        previousBlock.horizontalSpace !== block.horizontalSpace ||
        !isSameFont(previousBlock.font, block.font)
    )
        return false;
    const ratios = computeSpanStyleRatios(block.lines);
    return ratios.normal + ratios.italic >= 0.5;
}

function movePass(pages: Page[]) {
    let previousBlock: Block | undefined;
    for (const page of pages) {
        page.blocks = Array.from(
            page.blocks.filter(block => {
                if (block.type === 'header' || block.type === 'footer') return true;
                if (
                    previousBlock?.type === 'dialogue' &&
                    couldBeDialogContinuation(previousBlock, block)
                ) {
                    previousBlock.lines.push(...block.lines);
                    previousBlock = block;
                    return false;
                }

                previousBlock = block;
                return true;
            }),
        );
    }
}

function scanNamesPass(document: IRPage[]): Set<string> {
    const likelyNames = new Set<string>();
    const linesIterator = Iterator.from(document).flatMap(page =>
        page.blocks.flatMap(block => block.lines),
    );

    for (let line of linesIterator) {
        const lineText = getLineText(line);
        const names = parseNames(lineText)?.names;
        names?.forEach(name => {
            if ((getNameFont(name, line.styledText)?.style ?? 0) & FontStyles.Bold)
                likelyNames.add(name);
        });
    }

    return likelyNames;
}

function isNonScript(pages: Page[]): boolean {
    const blocks = Iterator.from(pages).flatMap(page => page.blocks);
    let dialogueCount = 0;
    let malformedDialogueCount = 0;
    let actionCount = 0;
    let sectionCount = 0;
    let unknownCount = 0;
    let blockCount = 0;
    let actors: Set<string> = new Set();
    for (let block of blocks) {
        blockCount++;
        switch (block.type) {
            case 'dialogue':
                dialogueCount++;
                if (block.text.trim().length === 0)
                    malformedDialogueCount++;
                block.actorNames.forEach(actors.add.bind(actors));
                break;
            case 'action':
                actionCount++;
                break;
            case 'section':
                sectionCount++;
                break;
            case 'unknown':
                unknownCount++;
                break;
            case 'header':
                break;
            case 'footer':
                break;
        }
    }

    let score = 0;
    if (pages.length < 5)
        score++;
    if (dialogueCount < pages.length)
        score++;
    if (dialogueCount < 30)
        score++;
    if (unknownCount > dialogueCount)
        score++;
    if (unknownCount >= blockCount * 0.5)
        score++;
    if (malformedDialogueCount > dialogueCount * 0.05)
        score++;
    if (actionCount < Math.min(sectionCount, 1))
        score++;
    if (actors.size < 5)
        score++;

    return score >= 4;
}

function detectExtraMetadataBlocks(pages: Page[]) {
    const firstPage = pages[0];
    let biggestBlock: Block | undefined = undefined;
    for (let block of firstPage.blocks)
        if ((block.font?.size ?? 0) > (biggestBlock?.font?.size ?? 0))
            biggestBlock = block;

    if (biggestBlock !== undefined && biggestBlock.lines.length > 0) {
        const firstLine = getLineText(biggestBlock.lines[0]).trim();
        const titleBlock = pages[0]
            .blocks
            .find(block => block.text.includes(firstLine)); 
        if (titleBlock !== undefined && titleBlock.type === 'unknown')
            titleBlock.type = 'title';
    }
}

export function analyzeDocument(document: IRPage[]): Page[] | undefined {
    const likelyNames = scanNamesPass(document);
    const pages = conversionPass(document, likelyNames);
    if (isNonScript(pages))
        return undefined;
    decorationPass(pages);
    movePass(pages);

    detectExtraMetadataBlocks(pages);

    return pages;
}
