const PAGE_SIZE = 1000;
const LEGACY_ID_BATCH_SIZE = 500;

function chunk(values, size) {
  const result=[];
  for(let i=0;i<values.length;i+=size) result.push(values.slice(i,i+size));
  return result;
}

export async function loadExistingWorkDocumentLinks(client, workspaceId, workId, pageSize=PAGE_SIZE) {
  if(!client?.from||!workspaceId||!workId) throw new Error("Parametri documenti lavoro non validi.");
  if(!Number.isInteger(pageSize)||pageSize<1||pageSize>PAGE_SIZE) throw new Error("Dimensione pagina non valida.");
  const rows=[];
  let offset=0;
  for(;;){
    const {data,error}=await client.from("condominium_work_documents")
      .select("id,document_id")
      .eq("workspace_id",workspaceId)
      .eq("work_id",workId)
      .order("id",{ascending:true})
      .range(offset,offset+pageSize-1);
    if(error) throw error;
    if(data!==null&&data!==undefined&&!Array.isArray(data)) throw new Error("Pagina collegamenti documentali non valida.");
    const page=data??[];
    if(page.some(row=>row?.id===null||row?.id===undefined)) throw new Error("ID collegamento documentale mancante.");
    rows.push(...page);
    if(page.length<pageSize) break;
    offset+=pageSize;
  }
  return rows;
}

export async function loadExistingWorkDocumentsByLegacyIds(client,workspaceId,legacyIds,pageSize=PAGE_SIZE,batchSize=LEGACY_ID_BATCH_SIZE){
  if(!client?.from||!workspaceId||!Array.isArray(legacyIds)) throw new Error("Parametri documenti non validi.");
  if(!Number.isInteger(pageSize)||pageSize<1||pageSize>PAGE_SIZE||!Number.isInteger(batchSize)||batchSize<1||batchSize>PAGE_SIZE) throw new Error("Dimensione batch non valida.");
  const ids=Array.from(new Set(legacyIds.map(Number).filter(Number.isFinite)));
  const rows=[];
  for(const batch of chunk(ids,batchSize)){
    let offset=0;
    for(;;){
      const {data,error}=await client.from("documents").select("id,legacy_id,title,data,category")
        .eq("workspace_id",workspaceId).in("legacy_id",batch).order("id",{ascending:true}).range(offset,offset+pageSize-1);
      if(error) throw error;
      if(data!==null&&data!==undefined&&!Array.isArray(data)) throw new Error("Pagina documenti non valida.");
      const page=data??[];
      if(page.some(row=>row?.id===null||row?.id===undefined)) throw new Error("ID documento mancante.");
      rows.push(...page);
      if(page.length<pageSize) break;
      offset+=pageSize;
    }
  }
  return rows;
}
