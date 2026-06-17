import i18n from '@dhis2/d2-i18n';
import {
    Button,
    ButtonStrip,
    Modal,
    ModalActions,
    ModalContent,
    ModalTitle,
    NoticeBox,
} from '@dhis2/ui';
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { ClimateDataset } from '../data/climateDatasets';
import type { ImportPeriod } from '../utils/time';
import type { GeoJsonFeature } from '../utils/toGeoJson';
import type { ImportConfig } from '../hooks/useImportConfigs';
import ExtractGeeData from './ExtractGeeData';

interface DataElement {
    id: string;
    displayName: string;
    code?: string;
}

interface ImportModalProps {
    dataset: ClimateDataset;
    period: ImportPeriod | null;
    features: GeoJsonFeature[];
    dataElement: DataElement;
    savedConfig?: ImportConfig | null;
    onClose: () => void;
    onImportDone?: (importCount: unknown, noDataMessage: string | null) => void;
}

const ImportModal = ({
    dataset,
    period,
    features,
    dataElement,
    savedConfig,
    onClose,
    onImportDone,
}: ImportModalProps) => {
    const [importSettled, setImportSettled] = useState(false);
    const [importSucceeded, setImportSucceeded] = useState(false);

    const handleSuccess = useCallback(
        (importCount: unknown, noDataMessage: string | null) => {
            setImportSettled(true);
            setImportSucceeded(true);
            onImportDone?.(importCount, noDataMessage);
        },
        [onImportDone],
    );

    const handleError = useCallback(
        (err?: unknown) => {
            setImportSettled(true);
            if (err != null) {
                const errMessage =
                    (err as { message?: string })?.message
                    ?? String(err);
                onImportDone?.(null, errMessage);
            }
        },
        [onImportDone],
    );

    return (
        <Modal large position="middle" onClose={importSettled ? onClose : undefined}>
            <ModalTitle>{i18n.t('Importing climate data')}</ModalTitle>
            <ModalContent>
                <ExtractGeeData
                    dataset={dataset}
                    period={period}
                    features={features}
                    dataElement={dataElement}
                    onSuccess={handleSuccess}
                    onError={handleError}
                />
                {importSettled && importSucceeded && savedConfig && (
                    <NoticeBox
                        valid
                        title={i18n.t('Saved as "{{name}}"', {
                            name: savedConfig.name,
                            nsSeparator: ';',
                        })}
                    >
                        <Link to="/chat/climate-import">{i18n.t('View in Imports →')}</Link>
                    </NoticeBox>
                )}
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button primary disabled={!importSettled} onClick={onClose}>
                        {importSettled ? i18n.t('Close') : i18n.t('Importing...')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    );
};

export default ImportModal;
