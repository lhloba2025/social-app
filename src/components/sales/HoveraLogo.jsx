import React, { useState } from 'react';

// شعار «هوفيرا». يعرض الصورة /hovera-logo.png إن وُجدت، وإلا يرتد لشعار نصّي.
// ضع ملف اللوقو في public/hovera-logo.png ليظهر تلقائياً.
export default function HoveraLogo({ size = 40, withText = true, className = '' }) {
  const [imgOk, setImgOk] = useState(true);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {imgOk ? (
        <img
          src="/hovera-logo.png"
          alt="هوفيرا"
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: 'contain' }}
          onError={() => setImgOk(false)}
          className="rounded-lg"
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0"
        >
          <span className="font-extrabold text-white" style={{ fontSize: size * 0.4 }}>هـ</span>
        </div>
      )}
      {withText && (
        <span className="font-extrabold text-white tracking-tight" style={{ fontSize: size * 0.5 }}>
          هوفيرا
        </span>
      )}
    </div>
  );
}
