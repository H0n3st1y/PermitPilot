export type Status="not_started"|"preparing"|"ready_to_submit"|"submitted"|"in_review"|"changes_requested"|"inspection_scheduled"|"approved"|"rejected"|"not_applicable";
export type Milestone={id:string;title:string;short:string;department:string;status:Status;dependencies:string[];min:number;max:number;start:number;end:number;source:string;documents:string[]};
export type Project={id:string;name:string;type:string;created:string;milestones:Milestone[];documents:{id:string;name:string;type:string;status:string}[]};
