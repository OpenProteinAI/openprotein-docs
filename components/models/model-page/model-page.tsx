'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { VersionCards, VersionDetail } from '@/components/models/model-page/versions';
import { ModelLinks } from '@/components/models/model-card';
import { AUTH } from '@/lib/auth/config';
import type { BaseModelView } from '@/lib/base-models';
import { paperBibtex } from '@/lib/model-bibtex';
import type { ModelCard } from '@/lib/model-cards';
import { versionPageUrl } from '@/lib/models-tree';

/** Picked a version before versions had pages. */
const QUERY_VERSION = 'version';

interface Props {
  view: BaseModelView;
  /** The version this page is: each has its own, the default the base model's. */
  card: ModelCard;
  /** Its REST operations, rendered on the server. */
  endpoints?: ReactNode;
}

export function ModelPage({ view, card, endpoints }: Props) {
  const router = useRouter();
  const bibtex = usePaperBibtex(card.doiUrl);

  // An old `?version=` link moves to its version's page.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get(QUERY_VERSION);
    if (wanted && wanted !== card.id && wanted in view.versionSlugs) {
      router.replace(versionPageUrl(view, wanted), { scroll: false });
    }
  }, [card.id, router, view]);

  return (
    <div className="op-models om-model-page">
      <div className="om-header">
        <div className="om-title-row">
          <h1 className="om-title">{card.name}</h1>
          <ModelLinks card={card} labelled />
        </div>
        {view.summary ? <p className="om-lead">{view.summary}</p> : null}
      </div>

      <section className="om-section">
        {/* One version has nothing to pick: its details stand alone. */}
        {view.versions.length > 1 ? (
          <>
            <h2 id="model-versions" className="om-section-title">
              Model versions
            </h2>
            <p className="om-section-lead">Select a version to see its details, endpoints and citation.</p>
            <VersionCards view={view} selected={card.id} />
          </>
        ) : null}
        <VersionDetail card={card} />
      </section>

      {endpoints ? (
        <section className="om-section">
          <h2 id="endpoints" className="om-section-title">
            Endpoints
          </h2>
          <div className="om-endpoints">
            {/* A build without sign-in renders no playground. */}
            {AUTH.enabled ? null : (
              <div className="om-login-banner">Sending requests needs login, which this build doesn&apos;t have.</div>
            )}
            {endpoints}
          </div>
        </section>
      ) : null}

      {bibtex || card.citation ? (
        <section className="om-section om-citation">
          <h2 id="citation" className="om-section-title">
            Citation
          </h2>
          {card.citation ? <p>{card.citation}</p> : null}
          {bibtex ? (
            <div className="om-citation-code">
              <DynamicCodeBlock lang="bibtex" code={bibtex} />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

/** The picked version's paper as BibTeX, asked of doi.org once it's picked; null until then, or without one. */
function usePaperBibtex(doiUrl?: string) {
  const [paper, setPaper] = useState<{ doiUrl: string; bibtex: string } | null>(null);

  useEffect(() => {
    if (!doiUrl) return;
    let current = true;
    paperBibtex(doiUrl).then((bibtex) => current && bibtex && setPaper({ doiUrl, bibtex }));
    return () => {
      current = false;
    };
  }, [doiUrl]);

  return paper && paper.doiUrl === doiUrl ? paper.bibtex : null;
}
