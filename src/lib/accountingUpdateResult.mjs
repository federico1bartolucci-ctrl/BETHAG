export async function requireAccountingUpdatedRow(query,label){
 if(!query||typeof query.select!=="function")throw new TypeError("Query di aggiornamento contabile non valida.");
 const {data,error}=await query.select("id").maybeSingle();if(error)throw error;
 if(!data||typeof data!=="object"||data.id==null||String(data.id).trim()==="")throw new Error(label+": nessuna modifica confermata. Il record potrebbe essere stato eliminato, non essere più accessibile o appartenere a un altro condominio. Ricarica la contabilità e riprova.");
 return data;
}
