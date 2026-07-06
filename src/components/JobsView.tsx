import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Job, JobPart, Customer, CustomerVehicle, JobPhoto } from '../types';
import { api } from '../lib/api';
import JobsPanelVideo from './JobsPanelVideo';
import { 
  ClipboardList, Plus, Trash2, Edit2, Calendar, Milestone, 
  User, Phone, Mail, FileText, CheckCircle, Clock, AlertTriangle,
  ArrowLeft, Package, DollarSign, PlusCircle, X, Wrench, FileEdit,
  Printer, Download, Search, Image, Upload
} from 'lucide-react';

interface JobsViewProps {
  refreshTrigger: number;
  initialSelectedJobId?: number | null;
  onInitialJobConsumed?: () => void;
}

export default function JobsView({ refreshTrigger, initialSelectedJobId, onInitialJobConsumed }: JobsViewProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobParts, setJobParts] = useState<JobPart[]>([]);
  const [jobPhotos, setJobPhotos] = useState<JobPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<Record<string, boolean>>({});
  const [selectedLightboxPhoto, setSelectedLightboxPhoto] = useState<JobPhoto | null>(null);
  const [photoCaptions, setPhotoCaptions] = useState<Record<string, string>>({ before: '', after: '' });

  const compressImage = (file: File, maxDimension = 1200): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };
  
  // Association lists for the forms
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [partsLoading, setPartsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status filters
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'In Progress' | 'Complete' | 'Cancelled'>('All');

  // Modals
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Job Form state
  const [vCustomerId, setVCustomerId] = useState('');
  const [vVehicleId, setVVehicleId] = useState('');
  const [jDesc, setJDesc] = useState('');
  const [jDiagnosisNotes, setJDiagnosisNotes] = useState('');
  const [jLaborNotes, setJNotes] = useState('');
  const [jStatus, setJStatus] = useState<Job['status']>('Pending');
  const [jEstCompletion, setJEstCompletion] = useState('');
  const [jLaborCost, setJLaborCost] = useState('0');
  const [hoursWorked, setHoursWorked] = useState('');
  const [shopSettings, setShopSettings] = useState<any>(null);

  // Part Form state
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [partQuantity, setPartQuantity] = useState('1');
  const [partUnitCost, setPartUnitCost] = useState('');
  const [partNotes, setPartNotes] = useState('');
  const [isAddingPart, setIsAddingPart] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchFormAssociations();
    fetchShopSettings();
  }, [refreshTrigger]);

  const fetchShopSettings = async () => {
    try {
      const data = await api.getShopSettings();
      setShopSettings(data);
    } catch (err) {
      console.error('Failed to load shop settings:', err);
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getJobs();
      setJobs(data);
      // Sync selected job if opened
      if (selectedJob) {
        const updated = data.find(j => j.id === selectedJob.id);
        if (updated) {
          setSelectedJob(updated);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load shop jobs.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFormAssociations = async () => {
    try {
      const custs = await api.getCustomers();
      setCustomers(custs);
      const vehs = await api.getVehiclesAll();
      setVehicles(vehs);
    } catch (err) {
      console.error('Failed to load associations for Job modal:', err);
    }
  };

  const fetchJobParts = async (jobId: number) => {
    setPartsLoading(true);
    try {
      const data = await api.getJobParts(jobId);
      setJobParts(data);
    } catch (err) {
      console.error('Failed to load job parts:', err);
    } finally {
      setPartsLoading(false);
    }
  };

  const fetchJobPhotos = async (jobId: number) => {
    setPhotosLoading(true);
    try {
      const data = await api.getJobPhotos(jobId);
      setJobPhotos(data);
    } catch (err) {
      console.error('Failed to load job photos:', err);
    } finally {
      setPhotosLoading(false);
    }
  };

  const handleSelectJob = (job: Job) => {
    setSelectedJob(job);
    fetchJobParts(job.id);
    fetchJobPhotos(job.id);
  };

  // Jumps straight to a specific ticket's detail view instead of the queue
  // list when arriving here via a deep link (e.g. clicking a service
  // history entry on a customer's profile). Runs once the job list has
  // finished loading, since the target job needs to exist in `jobs` first.
  useEffect(() => {
    if (initialSelectedJobId && jobs.length > 0) {
      const target = jobs.find((j) => j.id === initialSelectedJobId);
      if (target) {
        handleSelectJob(target);
        onInitialJobConsumed?.();
      }
    }
  }, [initialSelectedJobId, jobs]);

  // Status Badge Helper
  const renderStatusBadge = (status: Job['status']) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="bg-bg-theme border border-slate-700 text-slate-400 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Pending</span>
          </span>
        );
      case 'In Progress':
        return (
          <span className="bg-primary-theme/10 border border-primary-theme/20 text-primary-theme px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1">
            <Wrench className="w-3 h-3 text-primary-theme" />
            <span>In Progress</span>
          </span>
        );
      case 'Complete':
        return (
          <span className="bg-green-950/20 border border-green-800/30 text-green-400 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Complete</span>
          </span>
        );
      case 'Cancelled':
        return (
          <span className="bg-red-950/20 border border-red-800/30 text-red-400 px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold flex items-center gap-1">
            <X className="w-3 h-3 text-red-500" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return null;
    }
  };

  // Job add/edit dialog opening
  const openJobModal = (job: Job | null = null) => {
    if (job) {
      setEditingJob(job);
      setVCustomerId(job.customer_id.toString());
      setVVehicleId(job.vehicle_id.toString());
      setJDesc(job.description);
      setJDiagnosisNotes(job.diagnosis_notes || '');
      setJNotes(job.labor_notes || '');
      setJStatus(job.status);
      setJEstCompletion(job.estimated_completion);
      setJLaborCost(job.labor_cost?.toString() || '0');
      if (shopSettings && shopSettings.default_labor_rate > 0 && job.labor_cost) {
        setHoursWorked((job.labor_cost / shopSettings.default_labor_rate).toFixed(2));
      } else {
        setHoursWorked('');
      }
    } else {
      setEditingJob(null);
      setVCustomerId(customers.length > 0 ? customers[0].id.toString() : '');
      setVVehicleId('');
      setJDesc('');
      setJDiagnosisNotes('');
      setJNotes('');
      setJStatus('Pending');
      setJEstCompletion(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]); // 2 days default
      setJLaborCost('0');
      setHoursWorked('');
    }
    setIsJobModalOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vCustomerId || !vVehicleId) {
      alert('Required customer and vehicle associations missing.');
      return;
    }

    const payload = {
      customer_id: parseInt(vCustomerId, 10),
      vehicle_id: parseInt(vVehicleId, 10),
      description: jDesc,
      diagnosis_notes: jDiagnosisNotes,
      labor_notes: jLaborNotes,
      status: jStatus,
      estimated_completion: jEstCompletion,
      labor_cost: parseFloat(jLaborCost) || 0
    };

    try {
      if (editingJob) {
        await api.updateJob(editingJob.id, { ...editingJob, ...payload });
      } else {
        await api.addJob(payload);
      }
      setIsJobModalOpen(false);
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to save job details.');
    }
  };

  const handleDeleteJob = async (id: number) => {
    if (!window.confirm('Delete this repair work order permanently? Associated parts bills will also be deleted.')) return;
    try {
      await api.deleteJob(id);
      setSelectedJob(null);
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to delete job.');
    }
  };

  // Update status from within profile page
  const handleUpdateJobStatus = async (status: Job['status']) => {
    if (!selectedJob) return;
    try {
      const updated = { ...selectedJob, status };
      await api.updateJob(selectedJob.id, updated);
      await fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  // Parts handlers
  // Opens a Google Shopping search pre-filled with this vehicle + part name,
  // so the user gets a real local price comparison sourced from retailers'
  // own opted-in product feeds — legitimate and free, unlike scraping each
  // store directly. Remembers the shop's zip code in localStorage after the
  // first search so it doesn't need to be re-entered every time.
  const handleFindNearbyPrice = async () => {
    if (!selectedJob) return;
    if (!partName.trim()) {
      alert('Enter a part name first, then click Find Nearby Price.');
      return;
    }

    let zip = '';
    try {
      const settings = await api.getShopSettings();
      zip = settings.zip_code || '';
      if (!zip) {
        const entered = window.prompt('Enter your zip code for local price search (saved for next time):');
        if (!entered || !entered.trim()) return;
        zip = entered.trim();
        settings.zip_code = zip;
        await api.updateShopSettings(settings);
      }
    } catch (err) {
      console.error('Failed to resolve zip code from shop settings:', err);
      zip = localStorage.getItem('workshop_shop_zip') || '90210';
    }

    const vehicleParts = [
      selectedJob.vehicle_year,
      selectedJob.vehicle_make,
      selectedJob.vehicle_model,
      selectedJob.vehicle_engine,
    ].filter(Boolean).join(' ');

    const query = `${vehicleParts} ${partName}`.replace(/\s+/g, ' ').trim();
    const url = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(query)}&near=${encodeURIComponent(zip)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAddJobPart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    setIsAddingPart(true);
    const payload = {
      part_name: partName,
      part_number: partNumber,
      quantity: parseInt(partQuantity, 10) || 1,
      unit_cost: parseFloat(partUnitCost) || 0,
      notes: partNotes
    };

    try {
      await api.addJobPart(selectedJob.id, payload);
      setPartName('');
      setPartNumber('');
      setPartQuantity('1');
      setPartUnitCost('');
      setPartNotes('');
      fetchJobParts(selectedJob.id);
    } catch (err: any) {
      alert(err.message || 'Failed to add part billing line.');
    } finally {
      setIsAddingPart(false);
    }
  };

  const handleDeleteJobPart = async (partId: number) => {
    if (!selectedJob) return;
    if (!window.confirm('Remove this part line from the work order?')) return;
    try {
      await api.deleteJobPart(selectedJob.id, partId);
      fetchJobParts(selectedJob.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete part item.');
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>, photoType: 'before' | 'after') => {
    if (!selectedJob) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto((prev) => ({ ...prev, [photoType]: true }));
    try {
      const compressedDataUrl = await compressImage(file);
      const caption = photoCaptions[photoType] || '';
      await api.addJobPhoto(selectedJob.id, {
        photo_data: compressedDataUrl,
        caption,
        photo_type: photoType
      });
      setPhotoCaptions((prev) => ({ ...prev, [photoType]: '' }));
      await fetchJobPhotos(selectedJob.id);
    } catch (err: any) {
      alert(err.message || 'Failed to upload photo.');
    } finally {
      setIsUploadingPhoto((prev) => ({ ...prev, [photoType]: false }));
      e.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!selectedJob) return;
    if (!window.confirm('Delete this photo attachment?')) return;

    try {
      await api.deleteJobPhoto(selectedJob.id, photoId);
      await fetchJobPhotos(selectedJob.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete photo.');
    }
  };

  // Calculations
  const totalPartsCost = jobParts.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
  const totalWorkOrderCost = totalPartsCost + (selectedJob?.labor_cost || 0);
  const taxRatePercent = shopSettings?.tax_rate || 0;
  const taxAmount = (totalPartsCost + (selectedJob?.labor_cost || 0)) * (taxRatePercent / 100);
  const grandTotal = totalPartsCost + (selectedJob?.labor_cost || 0) + taxAmount;

  const shopName = shopSettings?.shop_name || 'WORKSHOP: RAGNARÖK';
  const tagline = shopSettings?.shop_name ? '' : 'Automotive Service & Repair';
  const shopAddress = [
    shopSettings?.shop_address,
    [shopSettings?.shop_city, shopSettings?.shop_state].filter(Boolean).join(', ')
  ].filter(Boolean).join(', ');
  const shopPhone = shopSettings?.shop_phone || '';
  const shopLogo = shopSettings?.shop_logo_url || '';

  // Filter list by status tabs and search keywords
  const filteredJobs = jobs.filter(j => {
    if (statusFilter !== 'All' && j.status !== statusFilter) return false;
    return true;
  });

  // Filter vehicles selection dropdown in form based on chosen customer
  const availableVehiclesForForm = vehicles.filter(v => v.customer_id.toString() === vCustomerId);

  // Sync default vehicle ID when customer changes in form
  useEffect(() => {
    if (availableVehiclesForForm.length > 0) {
      setVVehicleId(availableVehiclesForForm[0].id.toString());
    } else {
      setVVehicleId('');
    }
  }, [vCustomerId, vehicles]);

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!selectedJob) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter'
    });

    // Padded Ticket ID
    const paddedId = selectedJob.id.toString().padStart(4, '0');

    // Load Dynamic Shop Settings
    const shopName = shopSettings?.shop_name || 'WORKSHOP: RAGNARÖK';
    const tagline = shopSettings?.shop_name ? '' : 'Automotive Service & Repair';
    const shopAddress = [
      shopSettings?.shop_address,
      [shopSettings?.shop_city, shopSettings?.shop_state].filter(Boolean).join(', ')
    ].filter(Boolean).join(', ');
    const shopPhone = shopSettings?.shop_phone || '';
    const shopLogo = shopSettings?.shop_logo_url || '';
    const taxRatePercent = shopSettings?.tax_rate || 0;

    // Header Drawing with Logo
    if (shopLogo) {
      try {
        doc.addImage(shopLogo, 'JPEG', 40, 30, 45, 45);
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.text(shopName, 95, 45);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        let currentHeaderY = 57;
        if (tagline) {
          doc.text(tagline, 95, currentHeaderY);
          currentHeaderY += 12;
        }
        const contactLine = [shopAddress, shopPhone].filter(Boolean).join(' | ');
        if (contactLine) {
          doc.text(contactLine, 95, currentHeaderY);
        }
      } catch (err) {
        console.error('Error drawing logo image on PDF:', err);
        // Fallback layout without logo
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0);
        doc.text(shopName, 40, 50);

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        let currentHeaderY = 64;
        if (tagline) {
          doc.text(tagline, 40, currentHeaderY);
          currentHeaderY += 12;
        }
        const contactLine = [shopAddress, shopPhone].filter(Boolean).join(' | ');
        if (contactLine) {
          doc.text(contactLine, 40, currentHeaderY);
        }
      }
    } else {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text(shopName, 40, 50);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      let currentHeaderY = 64;
      if (tagline) {
        doc.text(tagline, 40, currentHeaderY);
        currentHeaderY += 12;
      }
      const contactLine = [shopAddress, shopPhone].filter(Boolean).join(' | ');
      if (contactLine) {
        doc.text(contactLine, 40, currentHeaderY);
      }
    }

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    doc.text('INVOICE', 570, 50, { align: 'right' });

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Ticket #${paddedId}`, 570, 65, { align: 'right' });
    doc.text(new Date().toLocaleDateString(), 570, 78, { align: 'right' });

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(1);
    doc.line(40, 95, 570, 95);

    // Three-column Info Block
    // Col 1: Bill To
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('BILL TO', 40, 120);
    
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(selectedJob.customer_name, 40, 135);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    let yOffset = 148;
    if (selectedJob.customer_phone) {
      doc.text(`Phone: ${selectedJob.customer_phone}`, 40, yOffset);
      yOffset += 13;
    }
    if (selectedJob.customer_email) {
      doc.text(`Email: ${selectedJob.customer_email}`, 40, yOffset);
    }

    // Col 2: Vehicle
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('VEHICLE', 220, 120);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`${selectedJob.vehicle_year} ${selectedJob.vehicle_make} ${selectedJob.vehicle_model}`, 220, 135);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`VIN: ${selectedJob.vehicle_vin || 'N/A'}`, 220, 148);
    doc.text(`Odometer: ${selectedJob.vehicle_current_mileage?.toLocaleString() || '0'} mi`, 220, 161);

    // Col 3: Service
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('SERVICE', 400, 120);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const descLines = doc.splitTextToSize(selectedJob.description, 170);
    doc.text(descLines, 400, 135);
    
    const descHeight = descLines.length * 12;
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Status: ${selectedJob.status}`, 400, 135 + descHeight + 3);
    doc.text(`Est. Completion: ${selectedJob.estimated_completion || 'N/A'}`, 400, 135 + descHeight + 16);

    let currentY = 195;

    // Diagnostics & Findings / Labor Performed
    if (selectedJob.diagnosis_notes || selectedJob.labor_notes) {
      doc.setDrawColor(230, 230, 230);
      doc.line(40, currentY, 570, currentY);
      currentY += 15;

      if (selectedJob.diagnosis_notes) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('DIAGNOSTICS & FINDINGS', 40, currentY);
        currentY += 12;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        const diagLines = doc.splitTextToSize(selectedJob.diagnosis_notes, 530);
        doc.text(diagLines, 40, currentY);
        currentY += (diagLines.length * 12) + 15;
      }

      if (selectedJob.labor_notes) {
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text('LABOR PERFORMED / COMMENTS', 40, currentY);
        currentY += 12;

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        const laborLines = doc.splitTextToSize(selectedJob.labor_notes, 530);
        doc.text(laborLines, 40, currentY);
        currentY += (laborLines.length * 12) + 15;
      }
    }

    // Parts Table Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('PARTS & MATERIALS', 40, currentY);
    currentY += 10;

    const tableBody = jobParts.length === 0
      ? [['No parts logged on this ticket.', '', '', '', '']]
      : jobParts.map(part => [
          part.part_name,
          part.part_number || 'N/A',
          part.quantity.toString(),
          `$${part.unit_cost?.toFixed(2)}`,
          `$${(part.quantity * part.unit_cost)?.toFixed(2)}`
        ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: 40, right: 40 },
      head: [['Part/Item', 'Part #', 'Qty', 'Unit Price', 'Total']],
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: [60, 60, 60],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      styles: {
        fontSize: 9,
        cellPadding: 6
      },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      },
      didDrawPage: (data) => {
        currentY = data.cursor ? data.cursor.y : currentY + 40;
      }
    });

    currentY += 20;

    // Attached Repair Photos in PDF
    if (jobPhotos.length > 0) {
      if (currentY > 580) {
        doc.addPage();
        currentY = 50;
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('ATTACHED REPAIR PHOTOS', 40, currentY);
      currentY += 15;

      let colIdx = 0;
      const photoWidth = 150;
      const photoHeight = 100;
      const colWidth = 150;
      const colGap = 40;

      for (const photo of jobPhotos) {
        if (currentY + 140 > 750) {
          doc.addPage();
          currentY = 50;
          colIdx = 0;
        }

        const colX = 40 + (colIdx * (colWidth + colGap));

        // Background box
        doc.setDrawColor(220, 220, 220);
        doc.setFillColor(249, 249, 249);
        doc.rect(colX - 4, currentY - 4, colWidth + 8, photoHeight + 32, 'FD');

        try {
          doc.addImage(photo.photo_data, 'JPEG', colX, currentY, photoWidth, photoHeight);
        } catch (imgErr) {
          console.error('Error rendering image in PDF:', imgErr);
          doc.setDrawColor(200, 200, 200);
          doc.rect(colX, currentY, photoWidth, photoHeight);
          doc.setFont('Helvetica', 'italic');
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text('[Image Error]', colX + 45, currentY + 50);
        }

        // Photo Type
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7);
        if (photo.photo_type === 'before') {
          doc.setTextColor(217, 119, 6); // amber
          doc.text('BEFORE REPAIR', colX, currentY + photoHeight + 10);
        } else {
          doc.setTextColor(22, 163, 74); // green
          doc.text('AFTER REPAIR', colX, currentY + photoHeight + 10);
        }

        // Caption
        if (photo.caption) {
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(80, 80, 80);
          const captionLines = doc.splitTextToSize(photo.caption, photoWidth);
          doc.text(captionLines[0], colX, currentY + photoHeight + 20);
        }

        colIdx++;
        if (colIdx >= 3) {
          colIdx = 0;
          currentY += photoHeight + 45;
        }
      }

      if (colIdx > 0) {
        currentY += photoHeight + 45;
      }
    }

    currentY += 10;

    if (currentY > 680) {
      doc.addPage();
      currentY = 50;
    }

    // Totals Block
    const totalX = 570;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Parts Subtotal:', totalX - 120, currentY);
    doc.setFont('Helvetica', 'bold');
    doc.text(`$${totalPartsCost.toFixed(2)}`, totalX, currentY, { align: 'right' });
    currentY += 15;

    doc.setFont('Helvetica', 'normal');
    doc.text('Labor Cost:', totalX - 120, currentY);
    doc.setFont('Helvetica', 'bold');
    doc.text(`$${selectedJob.labor_cost?.toFixed(2) || '0.00'}`, totalX, currentY, { align: 'right' });
    currentY += 15;

    // Calculate dynamic Tax rate and Grand Total
    const taxAmount = (totalPartsCost + (selectedJob?.labor_cost || 0)) * (taxRatePercent / 100);
    const grandTotal = totalPartsCost + (selectedJob?.labor_cost || 0) + taxAmount;

    doc.setFont('Helvetica', 'normal');
    doc.text(`Tax (${taxRatePercent.toFixed(2)}%):`, totalX - 120, currentY);
    doc.setFont('Helvetica', 'bold');
    doc.text(`$${taxAmount.toFixed(2)}`, totalX, currentY, { align: 'right' });

    currentY += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(totalX - 120, currentY, totalX, currentY);
    currentY += 15;

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL DUE:', totalX - 120, currentY);
    doc.text(`$${grandTotal.toFixed(2)}`, totalX, currentY, { align: 'right' });

    // Footer
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      'Thank you for your business. Please contact us with any questions regarding this invoice.',
      306,
      740,
      { align: 'center' }
    );

    doc.save(`Invoice-${paddedId}.pdf`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="jobs-view-container">
      
      {/* 1. Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-theme pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-theme" />
            Repair Tickets & Work Orders
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor diagnostics, maintain billing records, parts expenses, and work statuses.
          </p>
        </div>

        <button
          onClick={() => openJobModal()}
          className="bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-bold rounded-lg px-4 py-2 text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow self-start md:self-center cursor-pointer"
          id="btn-new-job"
        >
          <Plus className="w-4 h-4" />
          <span>Create Work Order</span>
        </button>
      </div>

      {loading && jobs.length === 0 ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Wrench className="w-8 h-8 text-primary-theme animate-spin" />
          <p className="text-slate-400 text-sm">Querying workshop jobs queue...</p>
        </div>
      ) : !selectedJob ? (
        // JOBS LIST & STATUS FILTER DECK
        <div className="space-y-4">
          
          {/* Status Tabs Filter */}
          <div className="flex flex-wrap gap-1.5 border-b border-border-theme pb-2 select-none">
            {(['All', 'Pending', 'In Progress', 'Complete', 'Cancelled'] as const).map((tab) => {
              const isActive = statusFilter === tab;
              const count = tab === 'All' 
                ? jobs.length 
                : jobs.filter(j => j.status === tab).length;

              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                    isActive
                      ? 'bg-primary-theme text-slate-950 shadow font-black'
                      : 'text-slate-400 hover:text-white bg-transparent hover:bg-surface-theme'
                  }`}
                >
                  {tab} ({count})
                </button>
              );
            })}
          </div>

          {/* Grid Layout list */}
          {filteredJobs.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-border-theme bg-surface-theme/10 rounded-xl max-w-xl mx-auto space-y-4">
              <ClipboardList className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-350 uppercase">Queue is Empty</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No active service tickets match this status filter.
              </p>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row items-start gap-6">
              <div className="flex-1 min-w-0 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6" id="jobs-tickets-grid">
                  {filteredJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => handleSelectJob(job)}
                      className="bg-gradient-to-b from-[#13141a]/80 to-bg-theme/80 backdrop-blur-sm border border-[#1e2028] hover:border-slate-700 hover:border-l-primary-theme border-l-[3px] border-l-[#1e2028] rounded-xl p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer group shadow-lg"
                      id={`job-ticket-card-${job.id}`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">
                            Ticket #{job.id.toString().padStart(4, '0')}
                          </span>
                          {renderStatusBadge(job.status)}
                        </div>

                        <div className="text-left">
                          <span className="text-[10px] font-mono text-primary-theme uppercase font-bold block mb-1">
                            {job.vehicle_year} {job.vehicle_make} {job.vehicle_model}
                          </span>
                          <h3 className="text-sm font-bold text-slate-101 group-hover:text-primary-theme transition-colors leading-snug truncate">
                            {job.description}
                          </h3>
                          <p className="text-xs text-slate-400 font-sans mt-2 line-clamp-1">
                            Client: <span className="text-slate-300 font-bold">{job.customer_name}</span>
                          </p>
                        </div>

                        <div className="pt-2 border-t border-border-theme/40 flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-600" />
                            Est: {job.estimated_completion || 'N/A'}
                          </span>
                          <span className="text-slate-300 font-bold bg-surface-theme border border-border-theme px-2 py-0.5 rounded">
                            {job.vehicle_current_mileage?.toLocaleString() || 0} mi
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-border-theme/40">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openJobModal(job);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-surface-theme transition cursor-pointer"
                          title="Edit ticket"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteJob(job.id);
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-surface-theme transition cursor-pointer"
                          title="Delete ticket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full lg:w-[420px] shrink-0 flex justify-center lg:justify-start">
                <JobsPanelVideo sources={['/jobs-calm.mp4', '/jobs-buff.mp4']} />
              </div>
            </div>
          )}
        </div>
      ) : (
        // TICKET PROFILE DETAIL MODE
        <div className="space-y-6 animate-fade-in text-left" id="job-ticket-detailed-profile">
          <button
            onClick={() => setSelectedJob(null)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition animate-fade-in"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Active Queue</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Box: Specs, Diagnostics, Parts, Billing */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Core Details Profile */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-6 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border-theme pb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-bg-theme border border-border-theme text-slate-300 px-2.5 py-0.5 rounded">
                        Ticket #{selectedJob.id.toString().padStart(4, '0')}
                      </span>
                      {renderStatusBadge(selectedJob.status)}
                    </div>
                    <h2 className="text-lg font-black text-white uppercase tracking-tight font-sans">
                      {selectedJob.vehicle_year} {selectedJob.vehicle_make} {selectedJob.vehicle_model}
                    </h2>
                    <p className="text-sm font-bold text-primary-theme">{selectedJob.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 self-start sm:self-center">
                    <button
                      onClick={() => openJobModal(selectedJob)}
                      className="border border-border-theme hover:border-primary-theme text-slate-350 px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer self-start"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      Edit Ticket Form
                    </button>
                    <button
                      onClick={handlePrintInvoice}
                      className="border border-border-theme hover:border-primary-theme text-slate-350 px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer self-start"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Invoice
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="border border-border-theme hover:border-primary-theme text-slate-350 px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer self-start"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>
                  </div>

                  <style>{`
                    @media print {
                      body > *:not(#print-only-content) {
                        display: none !important;
                      }
                      #print-only-content {
                        display: block !important;
                      }
                      tr {
                        page-break-inside: avoid !important;
                      }
                      table {
                        page-break-inside: auto !important;
                      }
                    }
                  `}</style>

                  {createPortal(
                    <div id="print-only-content" style={{ display: 'none', backgroundColor: '#fff', color: '#000', fontFamily: 'Arial, Helvetica, sans-serif', padding: '0.4in 0.5in', maxWidth: '8in', margin: '0 auto', boxSizing: 'border-box' }}>
                      {/* Letterhead */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #000', paddingBottom: '14px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {shopLogo && (
                            <img 
                              src={shopLogo} 
                              alt="Logo" 
                              style={{ width: '50px', height: '50px', objectFit: 'contain' }} 
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div>
                            <div style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '0.02em' }}>{shopName}</div>
                            {tagline && <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>{tagline}</div>}
                            {(shopAddress || shopPhone) && (
                              <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                                {[shopAddress, shopPhone].filter(Boolean).join(' | ')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.04em' }}>INVOICE</div>
                          <div style={{ fontSize: '11px', color: '#333', marginTop: '2px' }}>Ticket #{selectedJob.id.toString().padStart(4, '0')}</div>
                          <div style={{ fontSize: '10px', color: '#555' }}>{new Date().toLocaleDateString()}</div>
                        </div>
                      </div>

                      {/* Three-column Info Block */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px', paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid #ccc', fontSize: '10.5px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#555', marginBottom: '4px' }}>Bill To</div>
                          <div style={{ fontWeight: 700 }}>{selectedJob.customer_name}</div>
                          {selectedJob.customer_phone && <div style={{ color: '#555' }}>Phone: {selectedJob.customer_phone}</div>}
                          {selectedJob.customer_email && <div style={{ color: '#555', wordBreak: 'break-word' }}>Email: {selectedJob.customer_email}</div>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#555', marginBottom: '4px' }}>Vehicle</div>
                          <div style={{ fontWeight: 700 }}>{selectedJob.vehicle_year} {selectedJob.vehicle_make} {selectedJob.vehicle_model}</div>
                          <div style={{ color: '#555' }}>VIN: {selectedJob.vehicle_vin || 'N/A'}</div>
                          <div style={{ color: '#555' }}>Odometer: {selectedJob.vehicle_current_mileage?.toLocaleString() || '0'} mi</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#555', marginBottom: '4px' }}>Service</div>
                          <div style={{ fontWeight: 700 }}>{selectedJob.description}</div>
                          <div style={{ color: '#555' }}>Status: {selectedJob.status}</div>
                          <div style={{ color: '#555' }}>Est. Completion: {selectedJob.estimated_completion || 'N/A'}</div>
                        </div>
                      </div>

                      {/* Diagnostics & Findings / Labor Performed sections */}
                      {(selectedJob.diagnosis_notes || selectedJob.labor_notes) && (
                        <div style={{ paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid #ccc', fontSize: '10.5px' }}>
                          {selectedJob.diagnosis_notes && (
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#555', marginBottom: '2px' }}>Diagnostics &amp; Findings</div>
                              <div style={{ color: '#333', lineHeight: 1.5 }}>{selectedJob.diagnosis_notes}</div>
                            </div>
                          )}
                          {selectedJob.labor_notes && (
                            <div>
                              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#555', marginBottom: '2px' }}>Labor Performed / Comments</div>
                              <div style={{ color: '#333', lineHeight: 1.5 }}>{selectedJob.labor_notes}</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Parts Table */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#555', marginBottom: '6px' }}>Parts &amp; Materials</div>
                        <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '10px' }}>
                          <thead>
                            <tr>
                              <th style={{ borderBottom: '2px solid #000', padding: '5px 4px', textAlign: 'left', width: '32%' }}>Part/Item</th>
                              <th style={{ borderBottom: '2px solid #000', padding: '5px 4px', textAlign: 'left', width: '20%' }}>Part #</th>
                              <th style={{ borderBottom: '2px solid #000', padding: '5px 4px', textAlign: 'right', width: '14%' }}>Qty</th>
                              <th style={{ borderBottom: '2px solid #000', padding: '5px 4px', textAlign: 'right', width: '17%' }}>Unit Price</th>
                              <th style={{ borderBottom: '2px solid #000', padding: '5px 4px', textAlign: 'right', width: '17%' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {jobParts.length === 0 ? (
                              <tr>
                                <td colSpan={5} style={{ padding: '10px 4px', textAlign: 'center', color: '#777', fontStyle: 'italic', borderBottom: '1px solid #ccc' }}>No parts logged on this ticket.</td>
                              </tr>
                            ) : (
                              jobParts.map((part) => (
                                <tr key={part.id}>
                                  <td style={{ padding: '5px 4px', borderBottom: '1px solid #ccc', fontWeight: 600, wordWrap: 'break-word' }}>{part.part_name}</td>
                                  <td style={{ padding: '5px 4px', borderBottom: '1px solid #ccc', color: '#555', wordWrap: 'break-word' }}>{part.part_number || 'N/A'}</td>
                                  <td style={{ padding: '5px 4px', borderBottom: '1px solid #ccc', textAlign: 'right' }}>{part.quantity}</td>
                                  <td style={{ padding: '5px 4px', borderBottom: '1px solid #ccc', textAlign: 'right' }}>${part.unit_cost?.toFixed(2)}</td>
                                  <td style={{ padding: '5px 4px', borderBottom: '1px solid #ccc', textAlign: 'right', fontWeight: 700 }}>${(part.quantity * part.unit_cost)?.toFixed(2)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Printable Invoice Photos section */}
                      {jobPhotos.length > 0 && (
                        <div style={{ marginBottom: '16px', pageBreakInside: 'avoid' }}>
                          <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#555', marginBottom: '6px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
                            Attached Repair Photos
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            {jobPhotos.map((photo) => (
                              <div key={photo.id} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '4px', backgroundColor: '#f9f9f9', display: 'flex', flexDirection: 'column', gap: '4px', pageBreakInside: 'avoid' }}>
                                <img 
                                  src={photo.photo_data} 
                                  alt={photo.caption || 'Repair photo'} 
                                  style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '2px' }} 
                                  referrerPolicy="no-referrer"
                                />
                                <div style={{ fontSize: '8px', fontWeight: 600, textTransform: 'uppercase', color: photo.photo_type === 'before' ? '#d97706' : '#16a34a' }}>
                                  {photo.photo_type === 'before' ? 'Before Repair' : 'After Repair'}
                                </div>
                                {photo.caption && (
                                  <div style={{ fontSize: '8px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {photo.caption}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Totals */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px', fontSize: '10.5px' }}>
                        <div style={{ width: '220px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', marginBottom: '4px' }}>
                            <span>Parts Subtotal:</span>
                            <span>${totalPartsCost.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', marginBottom: '4px' }}>
                            <span>Labor Cost:</span>
                            <span>${selectedJob.labor_cost?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555', paddingBottom: '6px', marginBottom: '6px', borderBottom: '1px solid #ccc' }}>
                            <span>Tax ({taxRatePercent.toFixed(2)}%):</span>
                            <span>${taxAmount.toFixed(2)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '13px' }}>
                            <span>TOTAL DUE:</span>
                            <span>${grandTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div style={{ textAlign: 'center', color: '#999', fontSize: '9px', marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #ccc' }}>
                        Thank you for your business. Please contact us with any questions regarding this invoice.
                      </div>
                    </div>,
                    document.body
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-bg-theme border border-border-theme p-3.5 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Odometer In</span>
                    <span className="text-xs text-slate-200 font-bold block mt-1">
                      {selectedJob.vehicle_current_mileage?.toLocaleString() || '0'} mi
                    </span>
                  </div>
                  <div className="bg-bg-theme border border-border-theme p-3.5 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">VIN Number</span>
                    <span className="text-xs text-slate-200 font-bold block mt-1 truncate">
                      {selectedJob.vehicle_vin || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-bg-theme border border-border-theme p-3.5 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Est. Completion</span>
                    <span className="text-xs text-primary-theme font-bold block mt-1 font-mono">
                      {selectedJob.estimated_completion || 'N/A'}
                    </span>
                  </div>
                  <div className="bg-bg-theme border border-border-theme p-3.5 rounded-lg">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Labor Cost Estimate</span>
                    <span className="text-xs text-green-400 font-bold block mt-1 font-mono">
                      ${selectedJob.labor_cost?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>

                {selectedJob.diagnosis_notes && (
                  <div className="space-y-1.5 pt-2 border-t border-border-theme/40">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Diagnostics & Findings</span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-bg-theme/40 p-3.5 border border-border-theme rounded-lg font-sans">
                      {selectedJob.diagnosis_notes}
                    </p>
                  </div>
                )}

                {selectedJob.labor_notes && (
                  <div className="space-y-1.5 pt-2 border-t border-border-theme/40">
                    <span className="text-[10px] font-mono text-slate-500 uppercase block">Labor comments / Technicians Instructions</span>
                    <p className="text-xs text-slate-300 leading-relaxed bg-bg-theme/40 p-3.5 border border-border-theme rounded-lg font-sans">
                      {selectedJob.labor_notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Parts billing line items list */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-6 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-theme pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Package className="w-4.5 h-4.5 text-primary-theme" />
                    Parts List Bill / Materials ({jobParts.length})
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs font-mono font-bold">
                    <span className="text-slate-350 bg-bg-theme border border-border-theme px-3 py-1 rounded">
                      Parts: ${totalPartsCost.toFixed(2)}
                    </span>
                    <span className="text-slate-350 bg-bg-theme border border-border-theme px-3 py-1 rounded">
                      Labor: ${selectedJob.labor_cost?.toFixed(2) || '0.00'}
                    </span>
                    {taxRatePercent > 0 && (
                      <span className="text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded">
                        Tax ({taxRatePercent.toFixed(2)}%): ${taxAmount.toFixed(2)}
                      </span>
                    )}
                    <span className="text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded">
                      Grand Total: ${grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Sub part additions form */}
                <form onSubmit={handleAddJobPart} className="bg-bg-theme border border-border-theme rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black block">
                      Add Part / Fluid Expense Item
                    </span>
                    <button
                      type="button"
                      onClick={handleFindNearbyPrice}
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-theme hover:text-white bg-primary-theme/10 hover:bg-primary-theme border border-primary-theme/30 rounded px-2.5 py-1 transition cursor-pointer"
                      title="Search Google Shopping for this part on this vehicle, near your zip code"
                    >
                      <Search className="w-3 h-3" />
                      Find Nearby Price
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-3 space-y-1">
                      <label className="block text-[9px] font-mono text-slate-500 uppercase">Part Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Brake Pads"
                        value={partName}
                        onChange={(e) => setPartName(e.target.value)}
                        className="w-full bg-surface-theme border border-border-theme rounded px-2.5 py-1.5 text-xs text-slate-205 focus:border-primary-theme focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="block text-[9px] font-mono text-slate-500 uppercase">Part Number</label>
                      <input
                        type="text"
                        placeholder="e.g. EBC-8290"
                        value={partNumber}
                        onChange={(e) => setPartNumber(e.target.value)}
                        className="w-full bg-surface-theme border border-border-theme rounded px-2.5 py-1.5 text-xs text-slate-202 focus:border-primary-theme focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-[9px] font-mono text-slate-500 uppercase">Qty</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={partQuantity}
                        onChange={(e) => setPartQuantity(e.target.value)}
                        className="w-full bg-surface-theme border border-border-theme rounded px-2.5 py-1.5 text-xs text-slate-202 focus:border-primary-theme focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="block text-[9px] font-mono text-slate-500 uppercase">Unit Cost ($)</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 45.99"
                        value={partUnitCost}
                        onChange={(e) => setPartUnitCost(e.target.value)}
                        className="w-full bg-surface-theme border border-border-theme rounded px-2.5 py-1.5 text-xs text-slate-202 focus:border-primary-theme focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <button
                        type="submit"
                        disabled={isAddingPart}
                        className="w-full bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-bold py-2 rounded text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* Parts Table */}
                {partsLoading ? (
                  <div className="text-center py-6 text-slate-500 text-xs">Loading items...</div>
                ) : jobParts.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-border-theme text-slate-500 text-xs rounded-lg select-none">
                    No parts logged on this service ticket bill yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto select-none">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border-theme text-slate-500 uppercase font-mono tracking-wider">
                          <th className="pb-2">Part Details</th>
                          <th className="pb-2">Part #</th>
                          <th className="pb-2 text-right">Quantity</th>
                          <th className="pb-2 text-right">Unit Price</th>
                          <th className="pb-2 text-right">Total Price</th>
                          <th className="pb-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-theme text-slate-300">
                        {jobParts.map((part) => (
                          <tr key={part.id} className="hover:bg-bg-theme/35 transition">
                            <td className="py-3 font-semibold text-slate-200">{part.part_name}</td>
                            <td className="py-3 font-mono text-slate-400">{part.part_number || 'N/A'}</td>
                            <td className="py-3 text-right font-mono">{part.quantity}</td>
                            <td className="py-3 text-right font-mono">${part.unit_cost?.toFixed(2)}</td>
                            <td className="py-3 text-right font-bold text-slate-101 font-mono">
                              ${(part.quantity * part.unit_cost)?.toFixed(2)}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleDeleteJobPart(part.id)}
                                className="text-slate-500 hover:text-red-400 p-1 rounded transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Photos Section */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-6 space-y-6 shadow-xl">
                <div className="border-b border-border-theme pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Image className="w-4.5 h-4.5 text-primary-theme" />
                    Ticket Photo Attachments / Repair Records
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Before Repairs Sub-group */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-500 font-mono">
                        Before Repairs
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {jobPhotos.filter(p => p.photo_type === 'before').length} photos
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Before caption (optional)..."
                          value={photoCaptions.before}
                          onChange={(e) => setPhotoCaptions((prev) => ({ ...prev, before: e.target.value }))}
                          className="flex-1 bg-surface-theme border border-[#2b2d37] rounded px-2.5 py-1 text-xs text-slate-202 focus:outline-none focus:border-primary-theme"
                        />
                        <label className="flex items-center gap-1.5 bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-bold px-3 py-1 rounded text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap">
                          <Upload className="w-3 h-3" />
                          <span>{isUploadingPhoto.before ? 'Uploading...' : 'Add Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleUploadPhoto(e, 'before')}
                            disabled={isUploadingPhoto.before}
                          />
                        </label>
                      </div>
                    </div>

                    {photosLoading ? (
                      <div className="text-center py-4 text-slate-500 text-xs">Loading...</div>
                    ) : jobPhotos.filter(p => p.photo_type === 'before').length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-border-theme text-slate-500 text-xs rounded-lg select-none">
                        No before photos uploaded.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {jobPhotos.filter(p => p.photo_type === 'before').map((photo) => (
                          <div key={photo.id} className="relative group bg-bg-theme border border-border-theme rounded-lg overflow-hidden aspect-video cursor-pointer">
                            <img
                              src={photo.photo_data}
                              alt={photo.caption}
                              className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                              onClick={() => setSelectedLightboxPhoto(photo)}
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-200 flex flex-col justify-between p-1.5">
                              <div className="flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePhoto(photo.id);
                                  }}
                                  className="text-white hover:text-red-400 bg-black/40 hover:bg-black/60 p-1 rounded transition"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              {photo.caption && (
                                <p className="text-[9px] text-slate-200 truncate bg-black/40 px-1 py-0.5 rounded leading-tight">
                                  {photo.caption}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* After Repairs Sub-group */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-green-400 font-mono">
                        After Repairs
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {jobPhotos.filter(p => p.photo_type === 'after').length} photos
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="After caption (optional)..."
                          value={photoCaptions.after}
                          onChange={(e) => setPhotoCaptions((prev) => ({ ...prev, after: e.target.value }))}
                          className="flex-1 bg-surface-theme border border-[#2b2d37] rounded px-2.5 py-1 text-xs text-slate-202 focus:outline-none focus:border-primary-theme"
                        />
                        <label className="flex items-center gap-1.5 bg-primary-theme hover:bg-primary-theme/90 text-slate-950 font-bold px-3 py-1 rounded text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap">
                          <Upload className="w-3 h-3" />
                          <span>{isUploadingPhoto.after ? 'Uploading...' : 'Add Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleUploadPhoto(e, 'after')}
                            disabled={isUploadingPhoto.after}
                          />
                        </label>
                      </div>
                    </div>

                    {photosLoading ? (
                      <div className="text-center py-4 text-slate-500 text-xs">Loading...</div>
                    ) : jobPhotos.filter(p => p.photo_type === 'after').length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-border-theme text-slate-500 text-xs rounded-lg select-none">
                        No after photos uploaded.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {jobPhotos.filter(p => p.photo_type === 'after').map((photo) => (
                          <div key={photo.id} className="relative group bg-bg-theme border border-border-theme rounded-lg overflow-hidden aspect-video cursor-pointer">
                            <img
                              src={photo.photo_data}
                              alt={photo.caption}
                              className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                              onClick={() => setSelectedLightboxPhoto(photo)}
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition duration-200 flex flex-col justify-between p-1.5">
                              <div className="flex justify-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePhoto(photo.id);
                                  }}
                                  className="text-white hover:text-red-400 bg-black/40 hover:bg-black/60 p-1 rounded transition"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              {photo.caption && (
                                <p className="text-[9px] text-slate-200 truncate bg-black/40 px-1 py-0.5 rounded leading-tight">
                                  {photo.caption}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Status Updates + Contact Coordinates */}
            <div className="lg:col-span-4 space-y-6 select-none">
              
              {/* Status Update Card */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-350 font-sans border-b border-border-theme pb-2 text-left">
                  Job Status Control
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['Pending', 'In Progress', 'Complete', 'Cancelled'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateJobStatus(st)}
                      className={`py-2 rounded text-[10px] font-black uppercase tracking-wider transition ${
                        selectedJob.status === st
                          ? 'bg-primary-theme text-slate-950 font-bold shadow'
                          : 'bg-bg-theme border border-border-theme text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Coordinates Card */}
              <div className="bg-[#13141a]/80 backdrop-blur-sm border border-[#1e2028] rounded-xl p-5 space-y-4 shadow-xl text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-355 border-b border-border-theme pb-2">
                  Client Contact Coordinates
                </h3>

                <div className="space-y-3.5">
                  <div className="flex items-start gap-2.5">
                    <User className="w-4 h-4 text-primary-theme shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Client Name</span>
                      <span className="text-xs text-slate-202 font-bold block">{selectedJob.customer_name}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 border-t border-border-theme/40 pt-2.5">
                    <Phone className="w-4 h-4 text-primary-theme shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Telephone Number</span>
                      <a href={`tel:${selectedJob.customer_phone}`} className="text-xs text-slate-202 hover:text-primary-theme font-mono block underline">
                        {selectedJob.customer_phone || 'N/A'}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 border-t border-border-theme/40 pt-2.5">
                    <Mail className="w-4 h-4 text-primary-theme shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Email Address</span>
                      <a href={`mailto:${selectedJob.customer_email}`} className="text-xs text-slate-202 hover:text-primary-theme font-mono block underline truncate max-w-[180px]">
                        {selectedJob.customer_email || 'N/A'}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Create / Edit Job Modal */}
      {isJobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
          <div className="w-full max-w-lg rounded-xl border border-border-theme bg-surface-theme text-slate-100 overflow-hidden shadow-2xl">
            <div className="bg-bg-theme border-b border-border-theme px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4.5 h-4.5 text-primary-theme" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-202 font-mono">
                  {editingJob ? 'Edit Repair Work Order' : 'Create Repair Work Order'}
                </h3>
              </div>
              <button onClick={() => setIsJobModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJob} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              
              <div className="grid grid-cols-2 gap-4 text-left">
                {/* Customer Select dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Customer *</label>
                  <select
                    required
                    value={vCustomerId}
                    onChange={(e) => setVCustomerId(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-205 text-text-theme text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none cursor-pointer"
                  >
                    <option value="" disabled>Select Customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id.toString()}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Vehicle Select dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Vehicle *</label>
                  <select
                    required
                    value={vVehicleId}
                    onChange={(e) => setVVehicleId(e.target.value)}
                    disabled={!vCustomerId || availableVehiclesForForm.length === 0}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-205 text-text-theme text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none disabled:opacity-40 cursor-pointer"
                  >
                    <option value="" disabled>Select Vehicle...</option>
                    {availableVehiclesForForm.map((v) => (
                      <option key={v.id} value={v.id.toString()}>{v.year} {v.make} {v.model}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Repair Description / Customer Concern *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engine ticking noise on cold start, fluid leak checks"
                  value={jDesc}
                  onChange={(e) => setJDesc(e.target.value)}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-200 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none"
                />
              </div>

              <div className={`grid ${shopSettings && shopSettings.default_labor_rate > 0 ? 'grid-cols-4' : 'grid-cols-3'} gap-4 text-left`}>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Job Status</label>
                  <select
                    value={jStatus}
                    onChange={(e) => setJStatus(e.target.value as Job['status'])}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-202 text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Complete">Complete</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Est. Completion</label>
                  <input
                    type="date"
                    value={jEstCompletion}
                    onChange={(e) => setJEstCompletion(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-202 text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none"
                  />
                </div>
                {shopSettings && shopSettings.default_labor_rate > 0 && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Hours Worked</label>
                    <input
                      type="text"
                      placeholder="e.g. 2.5"
                      value={hoursWorked}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHoursWorked(val);
                        const hrs = parseFloat(val);
                        if (!isNaN(hrs) && hrs >= 0) {
                          const calculatedCost = hrs * shopSettings.default_labor_rate;
                          setJLaborCost(calculatedCost.toFixed(2));
                        }
                      }}
                      className="w-full rounded bg-bg-theme border border-border-theme text-slate-202 text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none font-mono"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Labor Cost ($)</label>
                  <input
                    type="text"
                    value={jLaborCost}
                    onChange={(e) => setJLaborCost(e.target.value)}
                    className="w-full rounded bg-bg-theme border border-border-theme text-slate-202 text-sm px-3 py-2.5 focus:border-primary-theme focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Diagnosis Findings & Notes</label>
                <textarea
                  placeholder="Insert findings from initial diagnostic check..."
                  value={jDiagnosisNotes}
                  onChange={(e) => setJDiagnosisNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-202 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-mono tracking-wider uppercase text-slate-400">Detailed Technicians Labor / Action Instructions</label>
                <textarea
                  placeholder="Mechanic instructions... e.g. check spark plug gap, check coil packs"
                  value={jLaborNotes}
                  onChange={(e) => setJNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded bg-bg-theme border border-border-theme text-slate-202 text-sm px-3.5 py-2.5 focus:border-primary-theme focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 border-t border-border-theme flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold tracking-wider text-slate-450 uppercase hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary-theme hover:bg-primary-theme/90 text-slate-950 px-5 py-2 text-xs font-black uppercase tracking-wider transition-all"
                >
                  {editingJob ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedLightboxPhoto && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 animate-fade-in"
          onClick={() => setSelectedLightboxPhoto(null)}
        >
          <button 
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 transition-all"
            onClick={() => setSelectedLightboxPhoto(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedLightboxPhoto.photo_data} 
              alt={selectedLightboxPhoto.caption || 'Ticket photo'} 
              className="max-w-full max-h-[75vh] object-contain rounded-lg border border-border-theme/40 shadow-2xl"
              referrerPolicy="no-referrer"
            />
            {selectedLightboxPhoto.caption && (
              <div className="bg-[#13141a]/90 border border-[#2b2d37] rounded-lg px-4 py-2 max-w-lg text-center shadow-xl">
                <p className="text-sm font-semibold text-slate-200">{selectedLightboxPhoto.caption}</p>
                <span className="text-[10px] font-mono text-slate-500 uppercase mt-1 block">
                  {selectedLightboxPhoto.photo_type === 'before' ? 'Before Repairs' : 'After Repairs'} • {selectedLightboxPhoto.uploaded_at ? new Date(selectedLightboxPhoto.uploaded_at).toLocaleString() : ''}
                </span>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

