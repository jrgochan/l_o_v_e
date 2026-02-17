"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/utils/api";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { Fragment } from "react";
import { ChevronDown } from "lucide-react";

export default function ConsentGate({ children }: { children: React.ReactNode }) {
  const { consentRequired, outstandingPolicies, token } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (consentRequired && token) {
      setIsOpen(true);
      // Pre-select required policies?
      // outstandingPolicies has "required" field.
      const requiredKeys = outstandingPolicies.filter((p) => p.required).map((p) => p.key);
      setSelectedPolicies(requiredKeys);
    } else {
      setIsOpen(false);
    }
  }, [consentRequired, outstandingPolicies, token]);

  const handleToggle = (key: string) => {
    setSelectedPolicies((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // 1. Grant consents
      await api.post("/consent/me", { policy_keys: selectedPolicies });

      // 2. Refresh profile/token to clear consent_required flag?
      // Actually backend only checks consent on Login.
      // BUT if we are here, we have a token (but maybe restricted?).
      // The backend doesn't restrict API access based on consent yet (except maybe legal compliance).

      // We need to update the store state.
      // We can assume success means consents are granted.
      // But we need to update `consentRequired` in store to false.

      // Ideally we call /auth/refresh or /users/me to verify?
      // But store.fetchUser() updates user object, not auth flags.
      // Auth flags came from login response.

      // We can manually update store state:
      useAuthStore.setState({ consentRequired: false, outstandingPolicies: [] });
      setIsOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to grant consents";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!consentRequired || !token) {
    return <>{children}</>;
  }

  // If consent required, block access (return null or show loading/gate behind modal)
  // We return children but show modal on top?
  // Risks: user can see content behind modal.
  // Better: DO NOT render children if strictly blocking.
  // But maybe render children with blur?

  return (
    <>
      <div
        className={`transition-filter duration-300 ${isOpen ? "blur-sm pointer-events-none" : ""}`}
      >
        {children}
      </div>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog className="relative z-50" onClose={() => {}}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all dark:bg-zinc-800">
                  <DialogTitle className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                    Policy Updates Required
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      We&apos;ve updated our policies. Please review and accept them to continue
                      using L.O.V.E.
                    </p>

                    <div className="mt-4 space-y-4">
                      {outstandingPolicies.map((policy) => (
                        <Disclosure key={policy.key}>
                          {({ open }: { open: boolean }) => (
                            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <input
                                    id={policy.key}
                                    name={policy.key}
                                    type="checkbox"
                                    checked={selectedPolicies.includes(policy.key)}
                                    onChange={() => handleToggle(policy.key)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <label
                                    htmlFor={policy.key}
                                    className="font-medium text-sm text-gray-900 dark:text-gray-100 cursor-pointer select-none"
                                  >
                                    {policy.title}
                                    {policy.required && (
                                      <span className="text-red-500 ml-1" title="Required">
                                        *
                                      </span>
                                    )}
                                  </label>
                                </div>
                                <DisclosureButton className="text-gray-400 hover:text-gray-500">
                                  <ChevronDown
                                    className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`}
                                  />
                                </DisclosureButton>
                              </div>
                              <DisclosurePanel className="mt-2 text-sm text-gray-500 dark:text-gray-400 pl-7">
                                {policy.description}
                              </DisclosurePanel>
                            </div>
                          )}
                        </Disclosure>
                      ))}
                    </div>

                    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50"
                      onClick={handleSubmit}
                      disabled={
                        isSubmitting ||
                        outstandingPolicies.some(
                          (p) => p.required && !selectedPolicies.includes(p.key)
                        )
                      }
                    >
                      {isSubmitting ? "Updating..." : "Accept & Continue"}
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
