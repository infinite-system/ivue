// demo-data.ts — the seed rows the in-browser mock AND the reference Node
// server (server-node/seed.ts) start with. One source for both runtimes.

export interface ContactRow {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  kind: 'person' | 'company';
  description?: string;
}

export const seedContacts: ContactRow[] = [
  { id: '1', name: 'Ada Lovelace', email: 'ada@analytical.engine', role: 'Engineer', company: 'Analytical Engines', kind: 'person', description: 'Wrote the first algorithm' },
  { id: '2', name: 'Grace Hopper', email: 'grace@navy.mil', role: 'Rear Admiral', company: 'US Navy', kind: 'person', description: 'Invented the compiler' },
  { id: '3', name: 'Alan Turing', email: 'alan@bletchley.uk', role: 'Cryptanalyst', company: 'Bletchley Park', kind: 'person', description: 'Broke Enigma' },
  { id: '4', name: 'Katherine Johnson', email: 'katherine@nasa.gov', role: 'Mathematician', company: 'NASA', kind: 'person', description: 'Calculated orbital trajectories' },
  { id: '5', name: 'Margaret Hamilton', email: 'margaret@mit.edu', role: 'Director', company: 'MIT Instrumentation Lab', kind: 'person', description: 'Led Apollo flight software' },
  { id: '6', name: 'Dennis Ritchie', email: 'dmr@bell-labs.com', role: 'Scientist', company: 'Bell Labs', kind: 'person', description: 'Created C and co-created Unix' },
  { id: '7', name: 'Barbara Liskov', email: 'liskov@mit.edu', role: 'Professor', company: 'MIT', kind: 'person', description: 'Substitution principle' },
  { id: '8', name: 'Linus Torvalds', email: 'linus@kernel.org', role: 'Maintainer', company: 'Linux Foundation', kind: 'person', description: 'Linux and git' },
  { id: '9', name: 'Anders Hejlsberg', email: 'anders@microsoft.com', role: 'Architect', company: 'Microsoft', kind: 'person', description: 'TypeScript and C#' },
  { id: '10', name: 'Evan You', email: 'evan@vuejs.org', role: 'Creator', company: 'Vue.js', kind: 'person', description: 'Created Vue' },
  { id: '11', name: 'Analytical Engines', email: 'info@analytical.engine', role: '', company: '', kind: 'company', description: 'Difference engines and more' },
  { id: '12', name: 'Bell Labs', email: 'info@bell-labs.com', role: '', company: '', kind: 'company', description: 'Where Unix was born' },
  { id: '13', name: 'Bletchley Park', email: 'info@bletchley.uk', role: '', company: '', kind: 'company', description: 'Wartime codebreaking' },
  { id: '14', name: 'NASA', email: 'info@nasa.gov', role: '', company: '', kind: 'company', description: 'Space exploration' },
  { id: '15', name: 'Vue.js', email: 'team@vuejs.org', role: '', company: '', kind: 'company', description: 'The progressive framework' },
];

export interface TagRow {
  id: string;
  name: string;
  color: string;
}

export const seedTags: TagRow[] = [
  { id: 't1', name: 'urgent', color: 'red' },
  { id: 't2', name: 'reviewed', color: 'green' },
  { id: 't3', name: 'draft', color: 'orange' },
  { id: 't4', name: 'archived', color: 'grey' },
  { id: 't5', name: 'favorite', color: 'purple' },
];
