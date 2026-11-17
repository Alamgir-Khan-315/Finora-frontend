import React from "react";
import { Phone, MessageCircle, ArrowUpRight, Globe, Mail, Link2, UserRound } from "lucide-react";
import { CONTACT, CONTACT_TEL, CONTACT_WA } from "../contact";

// "About me" and "Contact me": who made Finora, and how to order a website or software.
export default function Contact() {
  return <div className="contact-page">
    <section className="profile-head contact-hero">
      <span className="profile-avatar">AK</span>
      <div className="profile-id"><h2>{CONTACT.name}</h2><p>{CONTACT.role}</p></div>
      <p className="contact-pitch">Need a website or software for your business? I can build it for you.</p>
      <div className="contact-cta">
        <a className="btn btn-light" href={CONTACT.portfolio} target="_blank" rel="noopener noreferrer"><Globe size={16} />Visit profile<ArrowUpRight size={15} /></a>
        <a className="btn btn-light" href={CONTACT_TEL}><Phone size={16} />Contact</a>
        <a className="btn btn-wa" href={CONTACT_WA} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} />WhatsApp</a>
      </div>
    </section>

    <div className="grid-2">
      <section className="panel">
        <div className="panel-head"><div><h3>About me</h3><p>Who is behind Finora</p></div></div>
        <p className="about-text">I am <b>{CONTACT.name}</b>, a {CONTACT.role.toLowerCase()}. I made Finora, and I build websites and software for businesses. See my portfolio to find out more about my work.</p>
        <a className="btn btn-outline" href={CONTACT.portfolio} target="_blank" rel="noopener noreferrer"><UserRound size={16} />See my portfolio<ArrowUpRight size={15} /></a>
      </section>

      <section className="panel">
        <div className="panel-head"><div><h3>Contact me</h3><p>For a new website or software, get in touch.</p></div></div>
        <ul className="contact-list">
          <li><span className="ci"><Phone size={18} /></span><div><small>Phone / WhatsApp</small><b className="num">{CONTACT.phone}</b></div><a className="btn btn-outline" href={CONTACT_TEL}>Call</a></li>
          <li><span className="ci"><Globe size={18} /></span><div><small>Portfolio</small><b>{CONTACT.portfolio.replace(/^https?:\/\//, "").replace(/\/$/, "")}</b></div><a className="btn btn-outline" href={CONTACT.portfolio} target="_blank" rel="noopener noreferrer">Visit</a></li>
          {CONTACT.email && <li><span className="ci"><Mail size={18} /></span><div><small>Email</small><b>{CONTACT.email}</b></div><a className="btn btn-outline" href={`mailto:${CONTACT.email}`}>Email</a></li>}
          {CONTACT.links.map(l => <li key={l.url}><span className="ci"><Link2 size={18} /></span><div><small>{l.label}</small><b>{l.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</b></div><a className="btn btn-outline" href={l.url} target="_blank" rel="noopener noreferrer">Open</a></li>)}
        </ul>
      </section>
    </div>
  </div>;
}
