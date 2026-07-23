"use client";import {useEffect} from "react";import {useRouter} from "next/navigation";import {sampleProject,saveProject} from "@/lib/demo";
export default function Demo(){const router=useRouter();useEffect(()=>{const p=sampleProject();saveProject(p);router.replace(`/projects/${p.id}`)},[router]);return <main className="form-wrap"><p>Loading the demonstration project…</p></main>}
