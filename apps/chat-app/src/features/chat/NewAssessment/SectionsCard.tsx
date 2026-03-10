import i18n from '@dhis2/d2-i18n'
import { Card } from './Card'
import { ParsedSection } from './parseAssessmentJson'
import styles from './NewAssessment.module.css'

interface SectionsCardProps {
    sections: ParsedSection[]
}

export const SectionsCard = ({ sections }: SectionsCardProps) => (
    <Card
        accent="cs"
        step={2}
        title={i18n.t('Program Stage Sections')}
        badge={sections.length}
        preview={sections.slice(0, 3).map(s => s.name).join(' · ')}
        defaultOpen
    >
        <div className={styles.tScroll}>
            <table className={styles.t}>
                <thead>
                    <tr>
                        <th style={{ width: 56, textAlign: 'center' }}>{i18n.t('Order')}</th>
                        <th>{i18n.t('Section name')}</th>
                        <th style={{ width: 110, textAlign: 'center' }}>{i18n.t('Elements')}</th>
                        <th>{i18n.t('ID')}</th>
                    </tr>
                </thead>
                <tbody>
                    {sections.map(s => (
                        <tr key={s.id}>
                            <td style={{ textAlign: 'center' }}>
                                <span className={styles.sortBubble}>{s.sortOrder}</span>
                            </td>
                            <td>
                                <span className={styles.tName} title={s.name} style={{ maxWidth: 360 }}>
                                    {s.name}
                                </span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                <span className={styles.deCount}>{s.dataElementCount}</span>
                            </td>
                            <td className={styles.tMono}>{s.id}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </Card>
)
