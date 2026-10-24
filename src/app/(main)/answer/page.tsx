import { PageBody, PageHeader } from "@/shared/components/page-header";
import { getMemberOrRedirect } from "@/shared/lib/member";
import { getAnswerScreen } from "@/features/answer/queries";
import { AnswerBook } from "@/features/answer/components/answer-book";
import { AddPhrase, AnswerHistory } from "@/features/answer/components/answer-history";

export default async function AnswerPage() {
  const ctx = await getMemberOrRedirect();
  const { draws, phraseCount, ourPhraseCount } = await getAnswerScreen(ctx);
  return (
    <>
      <PageHeader title="해답의 책" />
      <PageBody>
        <AnswerBook phraseCount={phraseCount} />
        <AnswerHistory draws={draws} />
        <AddPhrase ourPhraseCount={ourPhraseCount} />
      </PageBody>
    </>
  );
}
