import { useNavigate } from 'react-router-dom'
import { cta } from '../brand'
import { handoffUrl } from '../lib/handoff.ts'
import type { HandoffRecord } from '../lib/handoff.ts'
import { qrMatrix, QR_SIZE } from '../lib/qr.ts'
import { Button } from './Button.tsx'
import { Modal } from './Modal.tsx'

/** QR pattern rendered black-on-white for scan-style contrast. */
function QrPattern({ token }: { token: string }) {
  const matrix = qrMatrix(token)
  const cell = 8
  return (
    <svg
      viewBox={`0 0 ${QR_SIZE * cell} ${QR_SIZE * cell}`}
      className="h-44 w-44"
      aria-hidden="true"
      focusable="false"
    >
      <rect width={QR_SIZE * cell} height={QR_SIZE * cell} fill="#ffffff" rx={10} />
      {matrix.flatMap((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect
              key={`${x}-${y}`}
              x={x * cell + 4}
              y={y * cell + 4}
              width={cell - 1.5}
              height={cell - 1.5}
              fill="#0a0b0b"
              rx={1.5}
            />
          ) : null,
        ),
      )}
    </svg>
  )
}

interface QrModalProps {
  record: HandoffRecord | null
  onClose: () => void
}

/**
 * Send-to-phone overlay: opaque token, QR placeholder, and an on-device link
 * that simulates the scan for the prototype.
 */
export function QrModal({ record, onClose }: QrModalProps) {
  const navigate = useNavigate()
  if (!record) return null
  return (
    <Modal open onClose={onClose} labelledBy="qr-modal-title" widthClass="max-w-xl" testId="qr-modal">
      <div className="flex flex-col items-center gap-5 p-8 text-center">
        <h2 id="qr-modal-title" className="font-display text-3xl font-bold text-signal-white">
          {cta.sendToPhone}
        </h2>
        <p className="max-w-md text-base text-static-gray">
          Point your camera at the code to keep{' '}
          <span className="font-semibold text-signal-white">{record.title}</span> going after the
          ride.
        </p>
        {record.sponsorLabel ? (
          <p className="text-sm text-static-gray">{record.sponsorLabel}</p>
        ) : null}
        <QrPattern token={record.token} />
        <p className="font-mono text-sm tracking-widest text-pulse-lime" data-testid="handoff-url">
          thefeed.example/go/{record.token}
        </p>
        <p className="text-sm text-static-gray">
          Link expires in 30 minutes. Demo QR — the pattern is a placeholder, so use the button
          below to simulate scanning.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="primary"
            icon="phone"
            onClick={() => {
              onClose()
              navigate(handoffUrl(record.token))
            }}
            data-testid="open-on-device"
          >
            Open on this device
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}
