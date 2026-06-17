import i18n from '@dhis2/d2-i18n';
import {
    Button,
    ButtonStrip,
    Modal,
    ModalActions,
    ModalContent,
    ModalTitle,
} from '@dhis2/ui';
import { formatBookmarkDate } from '../utils/time';
import type { ImportConfig } from '../hooks/useImportConfigs';

interface DeleteImportModalProps {
    config: ImportConfig;
    onCancel: () => void;
    onConfirm: () => void;
}

const DeleteImportModal = ({ config, onCancel, onConfirm }: DeleteImportModalProps) => (
    <Modal small onClose={onCancel} position="middle">
        <ModalTitle>
            {i18n.t('Delete "{{name}}"?', { name: config.name, nsSeparator: ';' })}
        </ModalTitle>
        <ModalContent>
            {config.createdByName && config.createdAt && (
                <p style={{ color: 'var(--colors-grey700)', marginBottom: '8px' }}>
                    {i18n.t('Created by {{name}} on {{date}}.', {
                        name: config.createdByName,
                        date: formatBookmarkDate(config.createdAt),
                        nsSeparator: ';',
                    })}
                </p>
            )}
            <p>
                {i18n.t(
                    'Deleting will remove the saved import and its update history. Imported data values in DHIS2 will not be affected.',
                )}
            </p>
        </ModalContent>
        <ModalActions>
            <ButtonStrip end>
                <Button onClick={onCancel}>{i18n.t('Cancel')}</Button>
                <Button destructive onClick={onConfirm}>{i18n.t('Delete')}</Button>
            </ButtonStrip>
        </ModalActions>
    </Modal>
);

export default DeleteImportModal;
