import React from "react";
import { ArrowUpRight, MessageCircle, Mail, Globe, Smartphone, Wrench } from "lucide-react";
import { DEVELOPER } from "../config";
import { waNumber } from "../lib";
import { Button } from "./ui";

const SERVICES = [[Globe, "Websites", "A website or landing page for your business."], [Smartphone, "Business apps", "Apps like Finora, made around how you work."], [Wrench, "Custom tools", "Calculators, reports and dashboards for your daily work."]];

export default function Contact({ portfolio }) {
  const wa = waNumber(DEVELOPER.whatsapp);
  const link = (href, icon, text, kind = "outline") => <a className={`btn btn-${kind}`} href={href} target="_blank" rel="noopener noreferrer">{icon}{text}</a>;
  return <>
    <section className="panel contact-hero">
      <span className="contact-avatar">{DEVELOPER.name}</span>
      <div><h3>Made by {DEVELOPER.name}</h3><p>Finora was designed and built by {DEVELOPER.name}. Want a website or software for your own business? Get in touch.</p></div>
      <div className="contact-actions">
        {link(portfolio, <ArrowUpRight size={15} />, "Visit profile", "primary")}
        {wa && link(`https://wa.me/${wa}`, <MessageCircle size={15} />, "WhatsApp")}
        {DEVELOPER.email && link(`mailto:${DEVELOPER.email}`, <Mail size={15} />, "Email")}
      </div>
    </section>
    <section className="panel">
      <div className="panel-head"><div><h3>What can be made for you</h3><p>Tell the developer what your business needs.</p></div></div>
      <div className="about-grid">{SERVICES.map(([Icon, title, text]) => <div key={title} className="about-card"><span className="about-icon"><Icon size={19} /></span><b>{title}</b><p>{text}</p></div>)}</div>
    </section>
  </>;
}
