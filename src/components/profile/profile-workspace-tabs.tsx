"use client";

import { CircleUserRound, ClipboardList, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

type ProfileTab = "overview" | "information" | "intake";

type ProfileWorkspaceTabsProps = {
  role: "coach" | "client";
  sidebar: ReactNode;
  overview: ReactNode;
  information: ReactNode;
  intake?: ReactNode;
};

export function ProfileWorkspaceTabs({ role, sidebar, overview, information, intake }: ProfileWorkspaceTabsProps) {
  const t = useTranslations("Account");
  const tabItems: Array<{ id: ProfileTab; label: string; icon: typeof CircleUserRound }> = [
    { id: "overview", label: t("tabOverview"), icon: CircleUserRound },
    { id: "information", label: t("tabInformation"), icon: ClipboardList },
    { id: "intake", label: t("tabIntake"), icon: FileText },
  ];
  const [activeTab, setActiveTab] = useState<ProfileTab>(() => (
    typeof window !== "undefined" && window.location.hash === "#profile-information" ? "information" : "overview"
  ));
  const visibleTabs = role === "client" ? tabItems : tabItems.filter((item) => item.id !== "intake");
  const activeContent = activeTab === "information" ? information : activeTab === "intake" && intake ? intake : overview;

  return (
    <div className="profile-workspace-body">
      <aside className="profile-section-rail">
        <div className="profile-rail-title"><span className="eyebrow">{t("accountCentre")}</span><strong>{t("profileMenu")}</strong></div>
        <nav className="profile-section-nav" aria-label={t("profileSectionsAria")} role="tablist">
          {visibleTabs.map((item) => {
            const Icon = item.icon;
            const selected = activeTab === item.id;
            return (
              <button
                aria-controls="profile-active-panel"
                aria-selected={selected}
                className={selected ? "is-active" : ""}
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                role="tab"
                type="button"
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        {sidebar}
      </aside>
      <main className="profile-workspace-content">
        <div className="profile-tab-panel" id="profile-active-panel" role="tabpanel" key={activeTab}>
          {activeContent}
        </div>
      </main>
    </div>
  );
}
