/* Encrypted offline text queue. Passphrase and plaintext never persist. No offline attachments. */
(function(root){
class APSEVault{
 constructor(storage,crypt){this.storage=storage;this.crypto=crypt;this.key=null;this.data=null;this.revision=0;this.name='apse-offline-v2';}
 async derive(pass,salt){if(pass.length<12)throw Error('Passphrase requires at least 12 characters');const raw=await this.crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);return this.crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},raw,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
 encode(a){const bytes=new Uint8Array(a);let raw='';for(let i=0;i<bytes.length;i+=32768)raw+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(raw);}
 decode(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
 async open(pass,snapshot){const saved=this.storage.getItem(this.name);if(saved){const e=JSON.parse(saved);this.salt=this.decode(e.salt);this.key=await this.derive(pass,this.salt);try{this.data=JSON.parse(new TextDecoder().decode(await this.crypto.subtle.decrypt({name:'AES-GCM',iv:this.decode(e.iv)},this.key,this.decode(e.body))));this.revision=e.revision;}catch(err){this.key=null;throw Error('Offline passphrase is incorrect or vault is damaged');}}
 else{if(!snapshot)throw Error('Offline vault has not been prepared');this.salt=this.crypto.getRandomValues(new Uint8Array(16));this.key=await this.derive(pass,this.salt);this.data={snapshot,queue:[]};this.revision=0;await this.save();}return this.data;}
 async save(){if(!this.key)throw Error('Offline vault is locked');const old=this.storage.getItem(this.name);if(old&&JSON.parse(old).revision!==this.revision)throw Error('Offline vault changed in another tab; unlock again');const iv=this.crypto.getRandomValues(new Uint8Array(12)),plain=new TextEncoder().encode(JSON.stringify(this.data)),cipher=await this.crypto.subtle.encrypt({name:'AES-GCM',iv},this.key,plain);const next=this.revision+1;this.storage.setItem(this.name,JSON.stringify({version:2,revision:next,salt:this.encode(this.salt),iv:this.encode(iv),body:this.encode(cipher)}));this.revision=next;}
 async queue(body,key,user){if(!this.key)throw Error('Prepare and unlock the encrypted offline vault first');if(this.data.snapshot.identity.id!==user)throw Error('Offline account mismatch');if(this.data.queue.length>=1000)throw Error('Queue limit 1000; synchronise first');const found=this.data.queue.find(r=>r.key===key);if(found){if(JSON.stringify(found.body)!==JSON.stringify(body))throw Error('Offline key conflict');return;}this.data.queue.push({key,body});try{await this.save();}catch(e){this.data.queue.pop();throw e;}}
 async remove(key){const old=this.data.queue;this.data.queue=old.filter(x=>x.key!==key);try{await this.save();}catch(e){this.data.queue=old;throw e;}}
 lock(){this.key=null;this.data=null;}
}
root.APSEVault=APSEVault;if(typeof module!=='undefined')module.exports=APSEVault;
})(globalThis);
