import type {
    InfoContainer,
    Value,
    ValueArray,
    ValueObject,
    FieldMetadataContainer,
    FieldMetadata,
    NestedFieldMetadata
} from "@molgenis/vip-report-vcf";

function listTables(db: any): string[] {
    const stmt = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    const names: string[] = [];
    try {
        while (stmt.step()) {
            const obj = stmt.getAsObject() as { name: string };
            names.push(obj.name);
        }
    } finally {
        stmt.free();
    }
    return names;
}

function tableExists(db: any, tableName: string): boolean {
    const stmt = db.prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=? LIMIT 1"
    );
    try {
        stmt.bind([tableName]);
        return stmt.step();
    } finally {
        stmt.free();
    }
}

function getRowsFromNestedTable(db: any, tableName: string, variantId: number): Record<string, unknown>[] {
    const stmt = db.prepare(`SELECT * FROM ${tableName} WHERE variant_id = ?`);
    const rows: Record<string, unknown>[] = [];
    try {
        stmt.bind([variantId]);
        while (stmt.step()) {
            const row = stmt.getAsObject() as Record<string, unknown>;
            delete (row as any).id;
            delete (row as any).variant_id;
            rows.push(row);
        }
    } finally {
        stmt.free();
    }
    return rows;
}

function parseNestedRowValues(
    row: Record<string, unknown>,
    nestedMeta?: NestedFieldMetadata
): Record<string, Value | ValueArray> {
    const out: Record<string, Value | ValueArray> = {};
    const sep = nestedMeta?.separator || null;
    for (const [k, v] of Object.entries(row)) {
        if (typeof v === "string" && sep && v.includes(sep)) {
            const arr = v.split(sep).map(s => s.trim());
            out[k] = arr as unknown as ValueArray;
        } else {
            out[k] = (v as Value) ?? null;
        }
    }
    return out;
}

function buildNestedValueArray(
    db: object,
    tableName: string,
    variantId: number,
    nestedMeta?: NestedFieldMetadata
): ValueArray {
    const rows = getRowsFromNestedTable(db, tableName, variantId);
    const arr: ValueObject[] = rows.map(r => {
        const parsed = parseNestedRowValues(r, nestedMeta);
        return parsed as ValueObject;
    });
    return arr as ValueArray;
}

function loadFlatInfoRow(db: any, variantId: number): Record<string, unknown> | undefined {
    const stmt = db.prepare("SELECT * FROM info WHERE variant_id = ?");
    try {
        stmt.bind([variantId]);
        if (stmt.step()) {
            const row = stmt.getAsObject() as Record<string, unknown>;
            delete (row as any).id;
            delete (row as any).variant_id;
            return row;
        }
    } finally {
        stmt.free();
    }
    return undefined;
}

export function loadInfoAsMap(
    db: object,
    variantId: number,
    infoMeta?: FieldMetadataContainer
): InfoContainer {
    const result: InfoContainer = {};
    const flat = loadFlatInfoRow(db, variantId) ?? {};
    for (const [k, v] of Object.entries(flat)) {
        result[k] = (v as Value) ?? null;
    }
    const tryKeys = infoMeta ? Object.keys(infoMeta) : [];
    const tables = tryKeys.length ? undefined : listTables(db);
    const ensureNested = (key: string, meta?: FieldMetadata) => {
        const tableName = `variant_${key}`;
        if (!tableExists(db, tableName)) return;
        const nestedMeta = meta?.nested;
        const nestedArr = buildNestedValueArray(db, tableName, variantId, nestedMeta);
        result[key] = nestedArr;
    };
    if (tryKeys.length) {
        for (const key of tryKeys) {
            const meta = infoMeta![key];
            if (meta?.nested) ensureNested(key, meta);
        }
    } else if (tables) {
        for (const t of tables) {
            if (t.startsWith("variant_")) {
                const key = t.substring("variant_".length);
                ensureNested(key, undefined);
            }
        }
    }
    return result;
}
