import Link from "next/link";
import {
  Facebook,
  X,
  Instagram,
  Linkedin,
  Github,
  MessageCircle,
  Mail,
  MessageSquare,
  Phone,
} from "lucide-react";

export default function SocialFooter() {
  return (
    <footer className="w-full bg-[#004B2E] text-[#FCF8E3] py-8 mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start space-y-8 md:space-y-0">
          {/* Logo and copyright */}
          <div className="flex flex-col items-center md:items-start space-y-2">
            <Link
              href="/"
              className="text-2xl font-bold text-[#D4AF37] rounded-md px-2 py-1 hover:bg-[#FCF8E3]/20 hover:text-[#D4AF37] transition-colors duration-200"
            >
              University HRIS
            </Link>
            <p className="text-sm text-[#FCF8E3]">
              &copy; {new Date().getFullYear()} Kaimosi Friends University. All rights reserved.
            </p>
          </div>

          {/* Quick navigation links */}
          <div className="flex flex-col items-center md:items-start space-y-2">
            <h3 className="text-lg font-semibold text-[#D4AF37]">Quick Links</h3>
            <div className="flex flex-col items-center justify-center space-y-2">
              <Link
                href="/about"
                className="text-[#FCF8E3] border border-[#D4AF37] rounded-md px-2 py-1 hover:bg-[#FCF8E3] hover:text-[#004B2E] transition-colors duration-200"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-[#FCF8E3] border border-[#D4AF37] rounded-md px-2 py-1 hover:bg-[#FCF8E3] hover:text-[#004B2E] transition-colors duration-200"
              >
                Contact
              </Link>
              <Link
                href="/privacy"
                className="text-[#FCF8E3] border border-[#D4AF37] rounded-md px-2 py-1 hover:bg-[#FCF8E3] hover:text-[#004B2E] transition-colors duration-200"
              >
                Privacy
              </Link>
            </div>
          </div>

          {/* Social media links */}
          <div className="flex flex-col items-center md:items-start space-y-2">
            <h3 className="text-lg font-semibold text-[#D4AF37]">Connect With Us</h3>
            <div className="flex flex-col space-y-2 bg-[#006837]/20 h-full m-2 rounded-2xl p-2 ">
              <span className="text-[#FCF8E3] font-semibold text-center">
                Social Links
              </span>
              <hr className="w-full border-[#D4AF37]" />

              {[
                {
                  href: "https://web.facebook.com/profile.php?id=61576682944507",
                  icon: <Facebook size={24} />,
                  label: "Facebook",
                },
                {
                  href: "https://x.com/DevIsaacMaina",
                  icon: <X size={24} />,
                  label: "Twitter (X)",
                },
                {
                  href: "https://www.instagram.com/devisaacmaina",
                  icon: <Instagram size={24} />,
                  label: "Instagram",
                },
                {
                  href: "https://www.linkedin.com/in/isaac-maina/?skipRedirect=true",
                  icon: <Linkedin size={24} />,
                  label: "LinkedIn",
                },
                {
                  href: "https://github.com/IsaacMaina",
                  icon: <Github size={24} />,
                  label: "GitHub",
                },
                {
                  href: "https://wa.me/254758302725",
                  icon: <MessageCircle size={24} />,
                  label: "WhatsApp",
                },
                {
                  href: "mailto:mainaisaacwachira2000@gmail.com",
                  icon: <Mail size={24} />,
                  label: "Email",
                },
                {
                  href: "sms:+254758302725",
                  icon: <MessageSquare size={24} />,
                  label: "SMS",
                },
                {
                  href: "tel:+254758302725",
                  icon: <Phone size={24} />,
                  label: "Phone",
                },
              ].map(({ href, icon, label }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#FCF8E3] rounded-md px-2 py-1 flex items-center space-x-2 hover:bg-[#FCF8E3] hover:text-[#004B2E] transition-colors duration-200"
                >
                  {icon}
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}