"use client";

import { ArrowRight, Sprout, Building2, Droplets, Zap, Leaf, TriangleAlert } from "lucide-react";
import { TOPICS, type TopicId } from "@/features/explorer/catalog";
import { REGIONS } from "@/features/earthlens-chat/regions";
import "./reference-home.css";

const icons = { agriculture: Sprout, "infrastructure-urban-change": Building2, water: Droplets, energy: Zap, "environmental-change": Leaf, "disaster-intelligence": TriangleAlert };

export function ReferenceHome({ onExplore, onAsk, onRegion }: { onExplore: (topic?: TopicId) => void; onAsk: () => void; onRegion: (id: string) => void }) {
  return <div className="reference-home">
    <section className="reference-hero">
      <p className="reference-kicker">Satellite intelligence for every township</p>
      <h1>Detect the Change.<br/>Understand the Trend.<br/><span>Make Better Decisions.</span></h1>
      <p className="reference-intro">NASA Earth observation data for Myanmar, turned into clear trends and AI guidance you can act on.</p>
      <div className="reference-map-preview"><img src="/home/myanmar.png" alt="Illustrated vegetation map of Myanmar with Yangon marked"/><div><span>EXPLORE MYANMAR</span><strong>Your location.<br/>Its changing environment.</strong><p>Rainfall · Temperature · Soil moisture</p></div></div>
      <p className="reference-caption">Map illustration · Open Explore for current data and interactive boundaries</p>
      <div className="reference-actions"><button className="reference-primary" onClick={()=>onExplore()}>Explore Live Trends <ArrowRight size={18}/></button><button onClick={onAsk}>Ask AI Assistant <ArrowRight size={18}/></button></div>
    </section>
    <section className="reference-section" id="systems"><p className="reference-kicker">EXPLORE</p><h2>Explore by Earth System</h2><p>Choose a category to explore observations, changes, and decision support.</p><div className="reference-systems">{TOPICS.map(topic=>{const Icon=icons[topic.id];return <button key={topic.id} onClick={()=>onExplore(topic.id)}><span className="reference-icon"><Icon size={25}/></span><h3>{topic.label}</h3><p>{topic.description}</p><span className="reference-card-action">Explore <ArrowRight size={16}/></span></button>;})}</div></section>
    <section className="reference-section reference-guidance"><p className="reference-kicker">EARTH SYSTEM ASSISTANT</p><h2>AI Decision Support</h2><p>Ask how the available observations relate to farming, planning, or your community.</p><div className="reference-guidance-card"><h3>Understand the evidence behind a decision</h3><p>Ask about rainfall, temperature, soil moisture, or environmental conditions in your selected location. Review the sources and observation dates alongside the answer.</p><button className="reference-primary" onClick={onAsk}>Ask AI Assistant <ArrowRight size={18}/></button></div></section>
    <section className="reference-section"><h2>How to use the Explore page</h2><div className="reference-steps">{[["Choose an Earth system", "Select a topic such as Agriculture or Water."],["Set your location and dataset", "Choose a region or township, a measurement, and an observation period."],["Explore the map", "Zoom and select an area using the interactive boundaries."],["Read the observations", "Review charts, data coverage, and source details."],["Compare changes", "Explore the available dates and measurements for your location."],["Ask for guidance", "Use the assistant to explain the evidence and its limitations."]].map(([title,description],index)=><article key={title}><span>{index+1}</span><div><h3>{title}</h3><p>{description}</p></div></article>)}</div></section>
    <section className="reference-section"><h2>Jump to a region</h2><p>Open its map and explore available observations.</p><div className="reference-regions">{REGIONS.map(region=><button key={region.id} onClick={()=>onRegion(region.id)}>{region.name} <ArrowRight size={14}/></button>)}</div></section>
  </div>;
}
