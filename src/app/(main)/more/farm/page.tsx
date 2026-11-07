import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { getFarmSetting } from "@/features/farm-setting/queries";
import { FarmSettingForm } from "@/features/farm-setting/components/farm-setting-form";

export default async function FarmSettingPage() {
  const ctx = await getMemberOrRedirect();
  const setting = await getFarmSetting(ctx);
  return (
    <>
      <PageHeader title="농장 정보" back="/more" />
      <PageBody>
        <FarmSettingForm setting={setting} canEdit={ctx.me.isAdmin} />
      </PageBody>
    </>
  );
}
