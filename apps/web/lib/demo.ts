import type { Milestone, Project, Status } from "./types";
const defs:Record<string,Omit<Milestone,"status"|"start"|"end">>={
 zoning:{id:"zoning",title:"Zoning compatibility review",short:"Zoning review",department:"Zoning",dependencies:[],min:5,max:10,source:"Demonstration zoning workflow record",documents:["Site or floor plan"]},
 health:{id:"health",title:"Food establishment health review",short:"Health review",department:"Public Health",dependencies:["zoning"],min:8,max:15,source:"Demonstration health workflow record",documents:["Food safety plan","Proposed menu"]},
 fire:{id:"fire",title:"Fire-safety review",short:"Fire review",department:"Fire Prevention",dependencies:["zoning"],min:4,max:8,source:"Demonstration fire-safety workflow record",documents:["Fire safety plan"]},
 registration:{id:"registration",title:"Local business registration",short:"Registration",department:"City Clerk",dependencies:["health","fire"],min:2,max:5,source:"Demonstration municipal intake guidance",documents:["Application form"]},
 building:{id:"building",title:"Building plan review",short:"Plan review",department:"Building",dependencies:["zoning"],min:10,max:20,source:"Demonstration building workflow record",documents:["Building drawings","Contractor information"]},
 inspection:{id:"inspection",title:"Final inspection",short:"Inspection",department:"Building",dependencies:["building","fire"],min:3,max:7,source:"Demonstration building workflow record",documents:["Inspection report"]},
 event:{id:"event",title:"Temporary event application",short:"Event application",department:"City Clerk",dependencies:[],min:3,max:6,source:"Demonstration municipal intake guidance",documents:["Event layout"]},
 works:{id:"works",title:"Public space and access review",short:"Public works",department:"Public Works",dependencies:["event"],min:5,max:10,source:"Demonstration public-works workflow record",documents:["Access and traffic plan"]},
 eventdone:{id:"eventdone",title:"Event coordination complete",short:"Event approval",department:"City Clerk",dependencies:["works","fire"],min:1,max:3,source:"Demonstration municipal intake guidance",documents:[]}
};
const flows:Record<string,string[]>={food_business:["zoning","health","fire","registration"],room_addition:["zoning","building","fire","inspection"],public_event:["event","fire","works","eventdone"]};
export function createProject(name:string,type:string):Project{const ids=flows[type]||flows.food_business;const end:Record<string,number>={};const milestones=ids.map(id=>{const d=defs[id];const start=Math.max(0,...d.dependencies.filter(x=>ids.includes(x)).map(x=>end[x]));end[id]=start+d.max;return {...d,status:"not_started" as Status,start,end:end[id]}});return{id:crypto.randomUUID(),name,type,created:new Date().toISOString(),milestones,documents:[]}}
export function sampleProject(){const p=createProject("Harbor Kitchen","food_business");p.milestones[0].status="approved";p.milestones[1].status="in_review";p.documents=[{id:"doc-1",name:"floor-plan.pdf",type:"Floor plan",status:"Ready"}];return p}
export function saveProject(p:Project){localStorage.setItem(`permitpilot:${p.id}`,JSON.stringify(p));localStorage.setItem("permitpilot:last",p.id)}
export function getProject(id:string){const raw=localStorage.getItem(`permitpilot:${id}`);return raw?JSON.parse(raw) as Project:null}
