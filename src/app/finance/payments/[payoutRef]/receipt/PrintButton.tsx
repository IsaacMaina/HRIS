'use client';

import React from 'react';

interface PrintButtonProps {
  className: string;
}

const PrintButton: React.FC<PrintButtonProps> = ({ className }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      className={className}
    >
      Print Receipt
    </button>
  );
};

export default PrintButton;