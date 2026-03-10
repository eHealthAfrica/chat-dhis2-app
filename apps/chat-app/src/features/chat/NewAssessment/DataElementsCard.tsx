import { useState } from 'react';
import i18n from '@dhis2/d2-i18n';
import { Card } from './Card';
import { ParsedDataElement } from './parseAssessmentJson';
import styles from './NewAssessment.module.css';

const stripHtml = (s: string) => (s || '').replace(/<[^>]*>/g, '').trim();

const ExpandableDesc = ({ html }: { html: string }) => {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    fontSize: 12,
                    color: '#4a6a8a',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                }}
            >
                <span style={{
                    display: 'inline-block',
                    transition: 'transform 0.2s',
                    transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
                >
                    ▸
                </span>
                {open ? i18n.t('Hide') : stripHtml(html).slice(0, 30) + (stripHtml(html).length > 30 ? '…' : '')}
            </button>
            {open && (
                <div
                    style={{ fontSize: 12, color: '#6e7a8a', marginTop: 4 }}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            )}
        </div>
    );
};

interface DataElementsCardProps {
    dataElements: ParsedDataElement[];
    query: string;
    setQuery: (v: string) => void;
}

export const DataElementsCard = ({ dataElements, query, setQuery }: DataElementsCardProps) => (
    <Card
        accent="ce"
        step={3}
        title={i18n.t('Data Elements')}
        badge={dataElements.length}
        preview={dataElements.slice(0, 3).map(d => d.code).filter(Boolean).join(' · ')}
        defaultOpen
        headRight={(
            <input
                className={styles.search}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={i18n.t('Search…')}
            />
        )}
    >
        <div className={styles.tScroll}>
            <table className={styles.t}>
                <thead>
                    <tr>
                        <th style={{ width: 36 }}>#</th>
                        <th style={{ minWidth: 150 }}>{i18n.t('Code')}</th>
                        <th style={{ minWidth: 220 }}>{i18n.t('Name')}</th>
                        <th style={{ minWidth: 170 }}>{i18n.t('Short name')}</th>
                        <th style={{ width: 110 }}>{i18n.t('Value type')}</th>
                        <th style={{ minWidth: 160 }}>{i18n.t('Option set')}</th>
                        <th style={{ minWidth: 150 }}>{i18n.t('Section')}</th>
                        <th style={{ minWidth: 240 }}>{i18n.t('Description')}</th>
                    </tr>
                </thead>
                <tbody>
                    {dataElements.map((de, i) => (
                        <tr key={de.id}>
                            <td className={styles.tNum}>{i + 1}</td>
                            <td className={styles.tMono}>{de.code}</td>
                            <td>
                                <span className={styles.tName} title={de.name} style={{ maxWidth: 260 }}>
                                    {de.name}
                                </span>
                            </td>
                            <td>
                                <span className={styles.tSub} title={de.shortName} style={{ maxWidth: 220 }}>
                                    {de.shortName}
                                </span>
                            </td>
                            <td>
                                <span className={styles.vTag}>{de.valueType}</span>
                            </td>
                            <td>
                                {de.optionSetName ? (
                                    <span title={de.optionSetId}>
                                        <span className={styles.tName} style={{ maxWidth: 220 }}>{de.optionSetName}</span>
                                        {typeof de.optionCount === 'number' ? (
                                            <span className={styles.tSub}>
                                                (
                                                {de.optionCount}
                                                )
                                            </span>
                                        ) : null}
                                    </span>
                                ) : (
                                    <span className={styles.dash}>—</span>
                                )}
                            </td>
                            <td>
                                {de.sectionName ? (
                                    <span className={styles.secTag} title={de.sectionName}>{de.sectionName}</span>
                                ) : (
                                    <span className={styles.dash}>—</span>
                                )}
                            </td>
                            <td>
                                {de.description ? (
                                    <ExpandableDesc html={de.description} />
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
);
