import "dotenv/config";
import { supabaseAdmin } from "../server/supabase-admin";

type BookSeed = {
  title: string;
  author: string;
  category_slug: string;
  publisher?: string;
  publication_year?: number;
  isbn?: string;
  description?: string;
  copies: number;
};

const SEED: BookSeed[] = [
  {
    title: "Dom Casmurro",
    author: "Machado de Assis",
    category_slug: "lit-brasileira",
    publisher: "Editora Garnier",
    publication_year: 1899,
    description:
      "Romance clássico de Machado de Assis que narra a história de Bento Santiago, mais conhecido como Bentinho, e Capitu, em uma narrativa marcada pelo ciúme e pela ambiguidade.",
    copies: 3,
  },
  {
    title: "Memórias Póstumas de Brás Cubas",
    author: "Machado de Assis",
    category_slug: "lit-brasileira",
    publication_year: 1881,
    description:
      "Considerada a obra que inaugurou o realismo no Brasil, narrada por um defunto-autor.",
    copies: 2,
  },
  {
    title: "Capitães da Areia",
    author: "Jorge Amado",
    category_slug: "lit-brasileira",
    publisher: "Companhia das Letras",
    publication_year: 1937,
    description: "A vida de meninos abandonados nas ruas de Salvador na década de 1930.",
    copies: 2,
  },
  {
    title: "Vidas Secas",
    author: "Graciliano Ramos",
    category_slug: "lit-brasileira",
    publication_year: 1938,
    description: "A saga de uma família de retirantes do sertão nordestino.",
    copies: 2,
  },
  {
    title: "Grande Sertão: Veredas",
    author: "João Guimarães Rosa",
    category_slug: "lit-brasileira",
    publication_year: 1956,
    description: "Obra-prima da literatura brasileira sobre o jagunço Riobaldo.",
    copies: 1,
  },
  {
    title: "O Pequeno Príncipe",
    author: "Antoine de Saint-Exupéry",
    category_slug: "infantojuvenil",
    publisher: "Agir",
    publication_year: 1943,
    description:
      "Clássico mundial sobre amizade, amor e a perspectiva infantil sobre o mundo adulto.",
    copies: 4,
  },
  {
    title: "O Menino Maluquinho",
    author: "Ziraldo",
    category_slug: "infantojuvenil",
    publisher: "Melhoramentos",
    publication_year: 1980,
    description: "As aventuras de um menino esperto e cheio de imaginação.",
    copies: 3,
  },
  {
    title: "Reinações de Narizinho",
    author: "Monteiro Lobato",
    category_slug: "infantojuvenil",
    publication_year: 1931,
    description: "Aventuras no Sítio do Picapau Amarelo.",
    copies: 2,
  },
  {
    title: "Cem Anos de Solidão",
    author: "Gabriel García Márquez",
    category_slug: "lit-estrangeira",
    publication_year: 1967,
    description: "Saga da família Buendía na fictícia cidade de Macondo.",
    copies: 2,
  },
  {
    title: "O Velho e o Mar",
    author: "Ernest Hemingway",
    category_slug: "lit-estrangeira",
    publication_year: 1952,
    description: "A luta de um pescador cubano contra um peixe gigante no Caribe.",
    copies: 2,
  },
  {
    title: "1984",
    author: "George Orwell",
    category_slug: "lit-estrangeira",
    publication_year: 1949,
    description: "Distopia clássica sobre vigilância, controle e totalitarismo.",
    copies: 3,
  },
  {
    title: "História de Schroeder",
    author: "Arquivo Histórico Municipal",
    category_slug: "schroeder",
    publisher: "Prefeitura de Schroeder",
    publication_year: 2010,
    description:
      "Compilação sobre a colonização alemã e o desenvolvimento do município de Schroeder, em Santa Catarina.",
    copies: 2,
  },
  {
    title: "Imigração Alemã no Vale do Itajaí",
    author: "Vários autores",
    category_slug: "historia",
    publication_year: 2005,
    description: "Histórias e relatos da colonização alemã na região do Vale do Itajaí.",
    copies: 2,
  },
  {
    title: "Antologia Poética",
    author: "Carlos Drummond de Andrade",
    category_slug: "poesia",
    publication_year: 1962,
    description: "Seleção dos melhores poemas do autor.",
    copies: 1,
  },
  {
    title: "Pedagogia do Oprimido",
    author: "Paulo Freire",
    category_slug: "educacao",
    publication_year: 1968,
    description: "Clássico da pedagogia crítica brasileira.",
    copies: 1,
  },
];

async function ensureBucket(name: string, isPublic: boolean) {
  const { data: existing } = await supabaseAdmin.storage.getBucket(name);
  if (existing) {
    console.log(`  ✓ bucket ${name} (already exists, public=${existing.public})`);
    return;
  }
  const { error } = await supabaseAdmin.storage.createBucket(name, { public: isPublic });
  if (error) {
    console.error(`  ✗ bucket ${name}: ${error.message}`);
    throw error;
  }
  console.log(`  ✓ bucket ${name} created (public=${isPublic})`);
}

async function main() {
  console.log("=== Seeding Cruz e Sousa ===\n");

  // 1. Storage buckets
  console.log("Storage buckets:");
  await ensureBucket("covers", true); // public — cover images
  await ensureBucket("documents", false); // private — verification docs

  // 2. Resolve library + categories
  const { data: lib, error: libErr } = await supabaseAdmin
    .from("libraries")
    .select("id")
    .eq("slug", "cruz-e-sousa")
    .single();
  if (libErr || !lib) throw new Error(`library not found: ${libErr?.message}`);
  const libraryId = lib.id;

  const { data: cats, error: catsErr } = await supabaseAdmin
    .from("categories")
    .select("id, slug")
    .eq("library_id", libraryId);
  if (catsErr || !cats) throw new Error(`categories: ${catsErr?.message}`);
  const catIdBySlug = new Map(cats.map((c) => [c.slug, c.id]));

  // 3. Seed books (idempotent on title+library)
  console.log("\nBooks:");
  let booksCreated = 0;
  let copiesCreated = 0;
  let skipped = 0;

  for (const b of SEED) {
    const category_id = catIdBySlug.get(b.category_slug);
    if (!category_id) {
      console.warn(`  ⚠ skipping "${b.title}" — category ${b.category_slug} missing`);
      continue;
    }

    // Check existence
    const { data: existing } = await supabaseAdmin
      .from("books")
      .select("id")
      .eq("library_id", libraryId)
      .eq("title", b.title)
      .eq("author", b.author)
      .maybeSingle();

    let bookId: string;
    if (existing) {
      bookId = existing.id;
      skipped++;
    } else {
      const { data: created, error: bookErr } = await supabaseAdmin
        .from("books")
        .insert({
          library_id: libraryId,
          category_id,
          title: b.title,
          author: b.author,
          description: b.description ?? null,
          publisher: b.publisher ?? null,
          publication_year: b.publication_year ?? null,
          isbn: b.isbn ?? null,
        })
        .select("id")
        .single();
      if (bookErr || !created) throw new Error(`book "${b.title}": ${bookErr?.message}`);
      bookId = created.id;
      booksCreated++;
    }

    // Copies (only create if none exist for this book)
    const { data: existingCopies } = await supabaseAdmin
      .from("book_copies")
      .select("id")
      .eq("book_id", bookId);
    if (existingCopies && existingCopies.length >= b.copies) {
      console.log(
        `  ✓ "${b.title}" (existing book, ${existingCopies.length} copies)`,
      );
      continue;
    }

    const startSeq = (existingCopies?.length ?? 0) + 1;
    const newCopies = b.copies - (existingCopies?.length ?? 0);
    const idSuffix = bookId.replace(/-/g, "").slice(-6).toUpperCase();
    const copyRows = Array.from({ length: newCopies }, (_, i) => ({
      library_id: libraryId,
      book_id: bookId,
      copy_code: `${idSuffix}-${String(startSeq + i).padStart(2, "0")}`,
      status: "available" as const,
    }));
    const { error: copiesErr } = await supabaseAdmin.from("book_copies").insert(copyRows);
    if (copiesErr) throw new Error(`copies for "${b.title}": ${copiesErr.message}`);
    copiesCreated += newCopies;
    console.log(`  ✓ "${b.title}" (+${newCopies} copies)`);
  }

  console.log(
    `\nDone: ${booksCreated} books created, ${skipped} already existed, ${copiesCreated} copies created`,
  );
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
