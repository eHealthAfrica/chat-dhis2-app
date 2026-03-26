import i18n from '@dhis2/d2-i18n'
import { Card } from './Card'
import { AssessmentPreview } from './parseAssessmentJson'
import styles from './NewAssessment.module.css'

interface ProgramCardProps {
    preview: AssessmentPreview
}

export const ProgramCard = ({ preview }: ProgramCardProps) => {
    const p  = preview.program
    const ps = preview.programStage
    if (!p && !ps) return null

    const rows: Array<{ label: string; val: string; mono?: boolean; wide?: boolean }> = []
    if (p) {
        rows.push({ label: i18n.t('Program name'),  val: p.name })
        rows.push({ label: i18n.t('Short name'),    val: p.shortName })
        rows.push({ label: i18n.t('Program type'),  val: p.programType })
        rows.push({ label: i18n.t('Program ID'),    val: p.id,  mono: true })
    }
    if (ps) {
        rows.push({ label: i18n.t('Stage name'),    val: ps.name })
        rows.push({ label: i18n.t('Stage ID'),      val: ps.id, mono: true })
        if (ps.description) rows.push({ label: i18n.t('Description'), val: ps.description, wide: true })
    }
    return (
        <Card
            accent="cp"
            step={1}
            title={i18n.t('Program')}
            preview={p?.name}
            defaultOpen
            className={styles.programCard}
        >
            <div className={styles.iGrid}>
                {rows.map(r => (
                    <div
                        key={r.label}
                        className={styles.iItem}
                        style={r.wide ? { gridColumn: '1 / -1' } : undefined}
                    >
                        <span className={styles.iLabel}>{r.label}</span>
                        {r.mono
                            ? <span className={styles.iMono}>{r.val}</span>
                            : <span className={styles.iValue}>{r.val}</span>}
                    </div>
                ))}
            </div>
        </Card>
    )
}
