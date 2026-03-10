import { useState } from 'react'
import i18n from '@dhis2/d2-i18n'
import { Card } from './Card'
import { ParsedOptionSet } from './parseAssessmentJson'
import styles from './NewAssessment.module.css'

interface OptionSetsCardProps {
    optionSets: ParsedOptionSet[]
    query: string
    setQuery: (v: string) => void
}

export const OptionSetsCard = ({ optionSets, query, setQuery }: OptionSetsCardProps) => {
    const [expanded, setExpanded] = useState<Set<string>>(new Set())

    const toggle = (id: string) =>
        setExpanded(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })

    return (
        <Card
            accent="co"
            step={4}
            title={i18n.t('Option Sets')}
            badge={optionSets.length}
            preview={optionSets.slice(0, 2).map(o => o.name).join(' · ')}
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
                            <th style={{ width: 36 }} />
                            <th>{i18n.t('Name')}</th>
                            <th style={{ width: 140 }}>{i18n.t('Value type')}</th>
                            <th style={{ width: 110, textAlign: 'center' }}>{i18n.t('Options')}</th>
                            <th>{i18n.t('ID')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {optionSets.map(os => {
                            const isOpen = expanded.has(os.id)
                            return (
                                <>
                                    <tr key={os.id} className={styles.osRow} onClick={() => toggle(os.id)}>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={[styles.osChev, isOpen ? styles.open : ''].join(' ')}>
                                                ▶
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.tName} title={os.name} style={{ maxWidth: 380 }}>
                                                {os.name}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={styles.vTag}>{os.valueType}</span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={styles.deCount}>{os.options.length}</span>
                                        </td>
                                        <td className={styles.tMono}>{os.id}</td>
                                    </tr>
                                    {isOpen ? (
                                        <tr key={`${os.id}-opts`} className={styles.osOptionsRow}>
                                            <td colSpan={5}>
                                                <div className={styles.optList}>
                                                    {os.options.map(opt => (
                                                        <span key={opt.id} className={styles.optChip}>
                                                            <span className={styles.optCode}>{opt.code}</span>
                                                            {opt.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : null}
                                </>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    )
}
