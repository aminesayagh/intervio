import type { ChatTransport, UIMessage } from 'ai'
import { AIProposal, RichTextAI } from '../ai/AskAI'
import { EditorText, PlateEditor } from '../editor/PlateEditor'
import { FloatingToolbar } from '../editor/Toolbar'
import { simulatedTransport } from './simulatedAI'

/** The editor with its toolbar and AI, as a record's description puts them, for the tests. */
export function TestEditor({
  value,
  onChange = () => {},
  onFailure = () => {},
  transport = simulatedTransport(),
  scope = 'test:record:1',
}: {
  value: string
  onChange?: (markdown: string) => void
  onFailure?: (failure: 'parse' | 'serialize') => void
  transport?: ChatTransport<UIMessage>
  scope?: string
}) {
  return (
    <PlateEditor
      initial={value}
      onChange={onChange}
      onFailure={onFailure}
      fallback={<p>{value}</p>}
    >
      <RichTextAI scope={scope} transport={transport}>
        <EditorText aria-label="Description" />
        <FloatingToolbar scope={scope} />
        <AIProposal />
      </RichTextAI>
    </PlateEditor>
  )
}
