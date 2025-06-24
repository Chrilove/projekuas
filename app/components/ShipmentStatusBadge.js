// components/ShipmentStatusBadge.js - Komponen untuk status pengiriman
import React from 'react';

const ShipmentStatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    const configs = {
      preparing: { 
        class: 'bg-warning text-dark', 
        text: 'Sedang Disiapkan',
        icon: 'fas fa-box'
      },
      in_transit: { 
        class: 'bg-primary text-white', 
        text: 'Dalam Perjalanan',
        icon: 'fas fa-truck'
      },
      delivered: { 
        class: 'bg-success text-white', 
        text: 'Terkirim',
        icon: 'fas fa-check-circle'
      },
      returned: { 
        class: 'bg-danger text-white', 
        text: 'Dikembalikan',
        icon: 'fas fa-undo'
      },
      cancelled: { 
        class: 'bg-secondary text-white', 
        text: 'Dibatalkan',
        icon: 'fas fa-times-circle'
      }
    };
    
    return configs[status] || { 
      class: 'bg-light text-dark', 
      text: status,
      icon: 'fas fa-question-circle'
    };
  };
  
  const config = getStatusConfig(status);
  
  return (
    <span className={`badge ${config.class}`}>
      <i className={`${config.icon} me-1`}></i>
      {config.text}
    </span>
  );
};

export default ShipmentStatusBadge;