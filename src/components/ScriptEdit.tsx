import { onMount, JSX } from 'solid-js';
import { $applyNodeReplacement, EditorConfig, TextNode, createEditor } from 'lexical';
import { HeadingNode, QuoteNode, registerRichText } from '@lexical/rich-text';

class HashtagNode extends TextNode {
    static getType(): string {
        return 'hashtag'
    }

    static clone(node: TextNode): TextNode {
        return new HashtagNode(node.__text, node.__key); 
    }

    createDOM(config: EditorConfig): HTMLElement {
        const element = super.createDOM(config);
        element.classList.add('hashtag');
        return element;
    }

    canInsertTextBefore(): boolean {
        return false;
    }

    isTextEntity(): boolean {
        return false;
    }
}

const hashtagRegex = /#[A-Za-z0-9_ä-]+/;

function hashtagNodeTransform(node: TextNode) {
    console.log(node);
    if (!node.isSimpleText() || node.hasFormat('code'))
        return;

    const text = node.getTextContent();
    const match = text.match(hashtagRegex);
    if (match === null)
        return text;

    let targetNode;
    if (match.index === 0) {
        [targetNode] = node.splitText(
            match.index + match[0].length
        )
    } else {
        [, targetNode] = node.splitText(
            match.index!,
            match.index! + match[0].length
        )
    }

    const hashtagNode = $applyNodeReplacement(new HashtagNode(text));
    targetNode.replace(hashtagNode);
}

function Editor() {
    const contentEditableElement = <div class="quipt-editor" spellcheck={false} contenteditable/> as HTMLDivElement;
    const editor = createEditor({
        namespace: 'QuiptEditor',
        nodes: [HashtagNode, HeadingNode, QuoteNode],
        onError: console.error
    });

    registerRichText(editor);

    onMount(() => {
        editor.setRootElement(contentEditableElement);
        editor.registerNodeTransform(TextNode, hashtagNodeTransform);
    })

    return contentEditableElement;
}

export function DesktopScriptEdit(): JSX.Element {

    return (
        <div class="desktop-edit">
            <h2>This is the scripts title</h2>
            <div class="division-overview">
            </div>
            <div class="text-edit">
                <Editor />
            </div>
        </div>
    );
}
