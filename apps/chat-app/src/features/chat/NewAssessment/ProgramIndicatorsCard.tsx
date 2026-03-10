import i18n from '@dhis2/d2-i18n'
import { Card } from './Card'
import { ParsedProgramIndicator } from './parseAssessmentJson'
import styles from './NewAssessment.module.css'

interface ProgramIndicatorsCardProps {
    indicators: ParsedProgramIndicator[]
    query: string
    setQuery: (v: string) => void
}

export const ProgramIndicatorsCard = ({ indicators, query, setQuery }: ProgramIndicatorsCardProps) => (
    <Card
        accent="ci"
        step={5}
        title={i18n.t('Program Indicators')}
        badge={indicators.length}
        preview={indicators.slice(0, 2).map(i => i.name).join(' · ')}
        defaultOpen={false}
        headRight={
            <input
                className={styles.search}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={i18n.t('Search…')}
            />
        }
    >
        <div className={styles.tScroll}>
            <table className={styles.t}>
                <thead>
                    <tr>
                        <th style={{ width: 36 }}>#</th>
                        <th>{i18n.t('Name')}</th>
                        <th style={{ width: 180 }}>{i18n.t('Analytics type')}</th>
                        <th style={{ width: 160 }}>{i18n.t('Aggregation')}</th>
                        <th>{i18n.t('Filter')}</th>
                    </tr>
                </thead>
                <tbody>
                    {indicators.map((pi, idx) => (
                        <tr key={pi.id}>
                            <td className={styles.tNum}>{idx + 1}</td>
                            <td>
                                <span className={styles.tName} title={pi.name} style={{ maxWidth: 380 }}>
                                    {pi.name}
                                </span>
                            </td>
                            <td>
                                <span className={styles.analyticsTag}>{pi.analyticsType}</span>
                            </td>
                            <td className={styles.tMono}>{pi.aggregationType}</td>
                            <td>
                                {pi.filter ? (
                                    <span className={styles.filterExpr} title={pi.filter}>
                                        {pi.filter}
                                    </span>
                                ) : (
                                    <span className={styles.dash}>—</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </Card>
)
