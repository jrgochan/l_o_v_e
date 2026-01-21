"use client";

import { useEffect, useState } from "react";
import { atlasService } from "@/services/atlasService";
import { EmotionCollection } from "@/types";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { reloadPage } from "@/utils/browser";

export function CollectionSwitcher() {
    const [loading, setLoading] = useState(false);
    const [activating, setActivating] = useState<string | null>(null);

    // Use local state for collections to avoid store complexity if not needed globally yet
    // or use store SET action
    const { collections, setCollections, activeCollectionId, setActiveCollection } = useAtlasAdminStore();

    useEffect(() => {
        loadCollections();
    }, []);

    const loadCollections = async () => {
        setLoading(true);
        try {
            const data = await atlasService.getCollections();
            setCollections(data.collections);
            // Find default
            const def = data.collections.find((c: EmotionCollection) => c.is_default);
            if (def) {
                setActiveCollection(def.id);
            }
        } catch (err) {
            console.error("Failed to load collections", err);
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async (id: string) => {
        setActivating(id);
        try {
            await atlasService.activateCollection(id);
            await loadCollections(); // Reload to refresh state
            // Force page reload to ensure all data is refreshed clean
            reloadPage();
        } catch (err) {
            console.error("Failed to activate collection", err);
        } finally {
            setActivating(null);
        }
    };

    if (loading && collections.length === 0) {
        return <div className="p-4 text-gray-400">Loading datasets...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-white mb-2">Emotion Dataset</h3>
                <p className="text-gray-400 text-sm mb-4">
                    Select the active emotion dataset for the entire L.O.V.E. stack.
                    Changing this will reload the application.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {collections.map((collection) => (
                    <div
                        key={collection.id}
                        className={`
              relative flex items-center p-4 rounded-lg border transition-all
              ${collection.is_default
                                ? "bg-purple-900/20 border-purple-500 shadow-lg shadow-purple-900/20"
                                : "bg-gray-800 border-gray-700 hover:border-gray-600"
                            }
            `}
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h4 className="text-base font-semibold text-white">
                                    {collection.name}
                                </h4>
                                {collection.is_default && (
                                    <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                                        Active
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-400">
                                {collection.description || "No description provided."}
                            </p>
                            <div className="mt-2 text-xs text-gray-500 font-mono">
                                ID: {collection.id}
                            </div>
                        </div>

                        <div className="ml-4">
                            {collection.is_default ? (
                                <button
                                    disabled
                                    className="px-4 py-2 bg-gray-700 text-gray-400 text-sm font-medium rounded cursor-not-allowed opacity-50"
                                >
                                    Selected
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleActivate(collection.id)}
                                    disabled={!!activating}
                                    className={`
                    px-4 py-2 text-sm font-medium rounded text-white transition-all
                    ${activating === collection.id
                                            ? "bg-gray-600 cursor-wait"
                                            : "bg-purple-600 hover:bg-purple-500 shadow hover:shadow-purple-500/25"
                                        }
                  `}
                                >
                                    {activating === collection.id ? "Activating..." : "Select"}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex gap-3">
                    <span className="text-xl">💡</span>
                    <div>
                        <h4 className="text-sm font-semibold text-blue-200">Did you know?</h4>
                        <p className="text-sm text-gray-300 mt-1">
                            Different datasets create completely different 'Soul Spheres'.
                            Atlas of the Heart has 87 emotions, while GoEmotions has 28 with different vector embeddings.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
