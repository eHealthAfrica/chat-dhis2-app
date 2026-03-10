import { useAlert } from '@dhis2/app-service-alerts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import i18n from '@dhis2/d2-i18n';
import { OpenAPI } from '@dhis2-chat/ui';

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
export interface ChatProgramPayload {
    name: string;
    shortName: string;
    code: string;
    programId: string;
    status: string;
}

export interface ChatProgramResponse {
    id: string;
    name: string;
    shortName: string;
    code: string;
    programId: string;
    status: string;
}

type UseSaveChatProgramOptions = {
    onSuccess?: (result: ChatProgramResponse) => void;
    onError?: (error: unknown) => void;
};

/* ─────────────────────────────────────────────────────────────
   Hook
───────────────────────────────────────────────────────────── */
export const useSaveChatProgram = ({
    onSuccess,
    onError,
}: UseSaveChatProgramOptions = {}) => {
    const queryClient = useQueryClient();

    const { show: showSuccessAlert } = useAlert(
        i18n.t('Assessment saved successfully'),
        { success: true },
    );
    const { show: showErrorAlert } = useAlert(
        i18n.t('Failed to save assessment'),
        { critical: true },
    );

    const mutation = useMutation<ChatProgramResponse, Error, ChatProgramPayload>({
        mutationFn: async (payload) => {
            const url = `${OpenAPI.BASE}/chat-programs/`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const text = await response.text().catch(() => response.statusText);
                throw new Error(
                    i18n.t('Server returned {{status}}: {{message}}', {
                        status: response.status,
                        message: text,
                    }),
                );
            }

            return response.json() as Promise<ChatProgramResponse>;
        },
        onSuccess: (result) => {
            showSuccessAlert();
            queryClient.invalidateQueries({ queryKey: ['chat-programs'] });
            onSuccess?.(result);
        },
        onError: (error) => {
            showErrorAlert();
            console.error('Failed to save chat program:', error);
            onError?.(error);
        },
    });

    return {
        saveChatProgram: mutation.mutateAsync,
        isSaving: mutation.isPending,
        error: mutation.error,
        reset: mutation.reset,
    };
};
