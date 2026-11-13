'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { apiClient } from '@/lib/api-client';
import './student-card-print.css';

interface StudentCardData {
  id: string;
  fullName: string;
  code: string;
  schoolName: string;
  qrImage: string;
}

export function StudentCardPrinter({ schoolId, studentIds, onClose, onError }: {
  schoolId: string;
  studentIds: string[];
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const printedRef = useRef(false);
  const [portalHost] = useState(() => typeof document === 'undefined' ? null : document.body);
  const [cards, setCards] = useState<StudentCardData[] | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let current = true;
    const load = async () => {
      const prepared: StudentCardData[] = [];
      // Bound parallel requests and generate QR locally; never call an external QR service.
      for (let offset = 0; offset < studentIds.length; offset += 4) {
        if (!current) return;
        const batch = await Promise.all(studentIds.slice(offset, offset + 4).map(async id => {
          const student = await apiClient.getStudent(schoolId, id);
          if (student.id !== id || student.schoolId !== schoolId || !student.code || student.qrData !== student.code) {
            throw new Error('Thông tin học sinh hoặc mã QR không hợp lệ. Vui lòng tải lại danh sách.');
          }
          const qrImage = await QRCode.toDataURL(student.qrData, {
            width: 384, margin: 4, errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#FFFFFF' },
          });
          return { id, fullName: student.fullName, code: student.code, schoolName: student.schoolName, qrImage };
        }));
        if (!current) return;
        prepared.push(...batch);
      }
      if (current) setCards(prepared);
    };
    load().catch((reason: unknown) => {
      if (current) onError(reason instanceof Error ? reason.message : 'Không thể chuẩn bị thẻ học sinh.');
    });
    return () => { current = false; };
  }, [schoolId, studentIds, onError]);

  const ready = !!cards?.length && cards.length === studentIds.length && cards.every(card => loadedImages[card.id]);
  const pages = cards ? Array.from({ length: Math.ceil(cards.length / 8) }, (_, index) => cards.slice(index * 8, index * 8 + 8)) : [];

  useEffect(() => {
    if (!ready) return;
    let current = true;
    const finished = () => onClose();
    window.addEventListener('afterprint', finished);
    document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        if (!current || printedRef.current) return;
        printedRef.current = true;
        try { window.print(); }
        catch { onError('Không mở được hộp thoại in. Vui lòng thử lại.'); }
      });
    });
    return () => { current = false; window.removeEventListener('afterprint', finished); };
  }, [ready, onClose, onError]);

  if (!portalHost) return null;
  return createPortal(<div className="student-card-print-root" data-print-ready={ready} aria-hidden="true">
    <div className="student-card-print-pages">
      {pages.map((page, index) => <section className="student-card-sheet" key={index} aria-label={`Trang in ${index + 1}`}>
        <div className="student-card-grid">
          {page.map(student => <article key={student.id} className="student-id-card" aria-label={`Thẻ học sinh ${student.fullName}`}>
            <header><span>THẺ HỌC SINH</span><strong title={student.schoolName}>{student.schoolName}</strong></header>
            <div className="student-id-card-content">
              <div className="student-id-card-identity"><h3 data-long-name={student.fullName.length > 40}>{student.fullName}</h3><span>Mã học sinh</span><strong>{student.code}</strong></div>
              {/* A local PNG keeps the QR sharp and reliably printable. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={student.qrImage} alt={`Mã QR của học sinh ${student.code}`} width={384} height={384}
                onLoad={() => setLoadedImages(previous => previous[student.id] ? previous : { ...previous, [student.id]: true })}
                onError={() => onError('Không tải được hình mã QR. Vui lòng thử lại.')} />
            </div>
          </article>)}
        </div>
      </section>)}
    </div>
  </div>, portalHost);
}
