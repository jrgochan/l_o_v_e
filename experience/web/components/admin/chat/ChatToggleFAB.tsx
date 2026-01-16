import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface ChatToggleFABProps {
    onClick: () => void;
    isUnread?: boolean;
}

export function ChatToggleFAB({ onClick, isUnread = false }: ChatToggleFABProps) {
    const theme = useAdminTheme();

    return (
        <button
            onClick={onClick}
            className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${theme.colors.primary} ${theme.effects.glass} border ${theme.colors.border}`}
            title="Open Emotional Chat"
        >
            <span className="text-2xl">💬</span>
            {isUnread && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-900" />
            )}
        </button>
    );
}
