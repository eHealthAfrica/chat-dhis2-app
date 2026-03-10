import { useState } from 'react'
import styles from './NewAssessment.module.css'

export type CardAccent = 'cp' | 'cs' | 'ce' | 'co' | 'ci' | 'cf'

interface CardProps {
    accent: CardAccent
    step: number
    title: string
    badge?: number | string
    preview?: string
    defaultOpen?: boolean
    children: React.ReactNode
    headRight?: React.ReactNode
}

export const Card = ({
    accent,
    step,
    title,
    badge,
    preview,
    defaultOpen = true,
    children,
    headRight,
}: CardProps) => {
    const [open, setOpen] = useState(defaultOpen)

    return (
        <div className={[styles.card, styles[accent]].join(' ')}>
            <div className={styles.cHead} onClick={() => setOpen(o => !o)} role="button" tabIndex={0}>
                <div className={styles.cNum}>{step}</div>
                <div className={styles.cLeft}>
                    <h3 className={styles.cTitle}>{title}</h3>
                    {badge !== undefined && <span className={styles.cBadge}>{badge}</span>}
                    {!open && preview ? <span className={styles.cPreview}>{preview}</span> : null}
                </div>
                {headRight ? (
                    <div className={styles.cHeadRight} onClick={e => e.stopPropagation()}>
                        {headRight}
                    </div>
                ) : null}
                <span className={[styles.cChev, open ? styles.open : ''].join(' ')} aria-hidden>
                    ▼
                </span>
            </div>
            {open ? <div className={styles.cBody}>{children}</div> : null}
        </div>
    )
}
