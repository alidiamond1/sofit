import { Boxes, PackageCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { database } from "@/lib/db";
import { Badge, Card, PageHeader } from "@/components/dashboard/primitives";
import { PackageCardActions, PackageWorkspace } from "./package-forms";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

type PackageRecord = {
  id: number | string;
  name: string;
  category: string;
  description: string | null;
  price: number | string;
  billing_interval: string;
  is_active: boolean | number;
  client_count: number | string;
};

export async function CoachPackages() {
  await requireRole("coach");
  const db = database();
  const [services, clients, packages, includedServices] = await Promise.all([
    db("services").select("id", "name", "type", "tier").where({ is_active: true }).orderBy("type").orderBy("name"),
    db("clients").select("clients.id", "users.name", "users.email").join("users", "users.id", "clients.user_id").whereNot("clients.status", "churned").orderBy("users.name"),
    db("packages")
      .select("packages.*")
      .count({ client_count: "clients.id" })
      .leftJoin("clients", "clients.package_id", "packages.id")
      .groupBy("packages.id")
      .orderByRaw("FIELD(packages.category, 'beginner', 'intermediate', 'elite', 'business', 'athlete')")
      .orderBy("packages.created_at", "desc"),
    db("package_services")
      .select("package_services.package_id", "package_services.service_id", "package_services.quantity", "services.name", "services.type", "services.tier")
      .join("services", "services.id", "package_services.service_id")
      .orderBy("services.type"),
  ]);

  const servicesByPackage = new Map<number, typeof includedServices>();
  for (const service of includedServices) {
    const packageId = Number(service.package_id);
    servicesByPackage.set(packageId, [...(servicesByPackage.get(packageId) || []), service]);
  }
  const packageRows = packages as unknown as PackageRecord[];
  const serviceOptions = services.map((service) => ({ ...service, id: Number(service.id) }));

  return (
    <>
      <PageHeader
        eyebrow="Coach controlled"
        title="Packages"
        description="Build packages from your Consultation, Diet, Workout, and Personal Training services, then assign them to clients."
      />

      <PackageWorkspace
        services={serviceOptions}
        clients={clients.map((client) => ({ ...client, id: Number(client.id) }))}
        packages={packageRows.filter((item) => item.is_active).map((item) => ({ id: Number(item.id), name: item.name, category: item.category }))}
      />

      <div className="section-row package-section-row">
        <div><span className="eyebrow">Your offers</span><h2>Beginner to Athlete</h2></div>
        <Badge>{packageRows.length} packages</Badge>
      </div>

      {packageRows.length === 0 ? (
        <Card className="empty-state"><Boxes size={24} /><h3>No packages yet</h3><p>Use Create package to build your first offer.</p></Card>
      ) : (
        <div className="package-grid">
          {packageRows.map((item) => {
            const packageServices = servicesByPackage.get(Number(item.id)) || [];
            return (
              <Card className={`package-card category-${item.category}`} key={item.id}>
                <div className="package-card-head">
                  <span className="package-symbol"><PackageCheck size={18} /></span>
                  <div className="package-card-controls">
                    <Badge tone={item.is_active ? "success" : "neutral"}>{item.category}</Badge>
                    <PackageCardActions
                      services={serviceOptions}
                      packageRecord={{
                        id: Number(item.id),
                        name: item.name,
                        category: item.category,
                        description: item.description,
                        price: Number(item.price || 0),
                        billing_interval: item.billing_interval,
                        client_count: Number(item.client_count || 0),
                        services: packageServices.map((service) => ({ serviceId: Number(service.service_id), quantity: Number(service.quantity) })),
                      }}
                    />
                  </div>
                </div>
                <h2>{item.name}</h2>
                <p>{item.description || "No description has been added."}</p>
                <div className="package-inclusions">
                  {packageServices.map((service) => (
                    <div key={`${item.id}-${service.name}`}>
                      <span>{service.name}</span>
                      <strong>{service.quantity}x</strong>
                    </div>
                  ))}
                </div>
                <div className="package-card-foot">
                  <div><strong>{money.format(Number(item.price || 0))}</strong><span>{item.billing_interval}</span></div>
                  <small>{Number(item.client_count || 0)} assigned clients</small>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
