import React from 'react';
import { Facebook, Users, X, Sparkles } from 'lucide-react';

const DevTeamModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const members = [
    {
      role: 'PLANNER',
      name: 'Kevin Robert L. Labiano, ABE.',
      photo: '/developer-picture/kevin.jpg',
      fb: 'https://www.facebook.com/kevin.robert.labiano',
      border: '#f59e0b',
      roleColor: '#fbbf24',
      badgeBg: '#78350f'
    },
    {
      role: 'ASS. PLANNER',
      name: 'Ben Jumbo B. Pangilinan',
      photo: '/developer-picture/ben.jpg',
      fb: 'https://www.facebook.com/venz.pangilinan',
      border: '#10b981',
      roleColor: '#34d399',
      badgeBg: '#064e3b'
    },
    {
      role: 'SYSTEM DEVELOPER',
      name: 'Roldan J. Turtor',
      photo: '/developer-picture/roldan.jpg',
      fb: 'https://www.facebook.com/roldan.m.lopez/',
      border: '#3b82f6',
      roleColor: '#60a5fa',
      badgeBg: '#1e3a8a'
    },
    {
      role: 'ASS. DEVELOPER',
      name: 'Angelo T. Tagob',
      photo: '/developer-picture/angelo.jpg',
      fb: 'https://www.facebook.com/angelo.tagob.96',
      border: '#8b5cf6',
      roleColor: '#a78bfa',
      badgeBg: '#4c1d95'
    }
  ];

  // Repeat member list 3x for continuous infinite marquee loop
  const marqueeItems = [...members, ...members, ...members];

  return (
    <div
      className="position-fixed bottom-0 start-0 w-100 shadow-lg"
      style={{
        zIndex: 2050,
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.98) 100%)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1.5px solid rgba(56, 189, 248, 0.35)',
        boxShadow: '0 -10px 35px rgba(0, 0, 0, 0.5)',
        height: '62px'
      }}
    >
      <style>{`
        @keyframes footerMarqueeScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .footer-marquee-track {
          animation: footerMarqueeScroll 22s linear infinite;
        }
        .footer-marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="h-100 px-3 px-md-4 d-flex align-items-center justify-content-between gap-3 overflow-hidden">
        {/* Left Section: Compact Dev Team Label */}
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center"
            style={{
              width: '32px',
              height: '32px',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}
          >
            <Users size={16} className="text-info" />
          </div>
          <div className="d-none d-sm-block">
            <div className="fw-bold text-white small lh-1" style={{ fontSize: '0.8rem', letterSpacing: '0.02em' }}>
              Development Team
            </div>
            <div className="text-info opacity-75" style={{ fontSize: '0.675rem' }}>
              Infinite Marquee
            </div>
          </div>
        </div>

        {/* Center Section: Slim Infinite Marquee Track */}
        <div className="position-relative overflow-hidden flex-grow-1 h-100 d-flex align-items-center">
          {/* Side Fades */}
          <div
            className="position-absolute top-0 start-0 h-100"
            style={{
              width: '40px',
              background: 'linear-gradient(to right, #0f172a, transparent)',
              zIndex: 5,
              pointerEvents: 'none'
            }}
          ></div>
          <div
            className="position-absolute top-0 end-0 h-100"
            style={{
              width: '40px',
              background: 'linear-gradient(to left, #1e293b, transparent)',
              zIndex: 5,
              pointerEvents: 'none'
            }}
          ></div>

          {/* Marquee Track */}
          <div className="footer-marquee-track d-flex align-items-center gap-3">
            {marqueeItems.map((member, idx) => (
              <div
                key={idx}
                className="d-flex align-items-center gap-2.5 px-3 py-1.5 rounded-pill flex-shrink-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: `1px solid ${member.border}55`,
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                {/* Avatar */}
                <div
                  className="rounded-circle overflow-hidden d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: '30px',
                    height: '30px',
                    border: `1.5px solid ${member.border}`,
                    background: '#1e293b'
                  }}
                >
                  <img
                    src={member.photo}
                    alt={member.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentNode.innerText = member.name.substring(0, 2).toUpperCase();
                      e.target.parentNode.style.fontWeight = 'bold';
                      e.target.parentNode.style.fontSize = '10px';
                      e.target.parentNode.style.color = '#ffffff';
                    }}
                  />
                </div>

                {/* Role & Name */}
                <div className="d-flex align-items-center gap-2">
                  <span
                    className="badge px-2 py-0.5 rounded-pill fw-bold text-uppercase"
                    style={{
                      backgroundColor: member.badgeBg,
                      color: member.roleColor,
                      border: `1px solid ${member.border}44`,
                      fontSize: '0.625rem',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {member.role}
                  </span>
                  <span className="fw-bold text-white small text-nowrap" style={{ fontSize: '0.825rem' }}>
                    {member.name}
                  </span>
                </div>

                {/* FB Icon */}
                <a
                  href={member.fb}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm p-1 rounded-circle d-flex align-items-center justify-content-center text-white ms-1"
                  style={{ width: '24px', height: '24px', background: '#1877f2', border: 'none' }}
                  title={`Visit ${member.name}'s Facebook Profile`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Facebook size={12} fill="#ffffff" stroke="none" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Right Section: Close Button */}
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm text-light rounded-circle p-1 border-0 opacity-75 d-flex align-items-center justify-content-center"
            style={{ background: 'rgba(255, 255, 255, 0.12)', width: '32px', height: '32px' }}
            title="Close Dev Team Marquee"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DevTeamModal;
