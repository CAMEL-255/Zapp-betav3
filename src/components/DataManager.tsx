import React, { useState, useEffect } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';
import { dataService } from '../services/dataService';
import { DataItem, DataType } from '../types';
import { DATA_TYPES, getDataTypeConfig } from '../config/dataTypes';
import { Plus, Edit, Trash2, Link, Check, Move } from 'lucide-react';
import EditDataModal from './EditDataModal';
import { useToast } from '../hooks/useToast';

/** ----------------------- إعدادات الكاتيجوري ----------------------- **/
const CATEGORY_ORDER: DataType[] = [
  'id_card',
  'license',
  'photo',
  'document',
  'other',
];

const CATEGORY_LABELS: Record<DataType, string> = {
  id_card: 'ID Cards',
  license: 'License',
  photo: 'Photos',
  document: 'Documents',
  other: 'Others',
};
/** ------------------------------------------------------------------ **/

/** ----------------------- كارت قابل للسحب (لكل عنصر) ----------------------- **/
type Position = { x: number; y: number };

const DraggableCard: React.FC<{
  item: DataItem;
  isActive: boolean;
  isExpanded: boolean;
  pos: Position;
  copiedLink: string | null;
  formatFileSize: (bytes?: number) => string;
  onToggleExpand: (id: string) => void;
  onCopyLink: (item: DataItem) => void;
  onDelete: (id: string) => void;
  onEdit: (item: DataItem) => void;
  onToggleLinkStatus: (id: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}> = ({
  item,
  isActive,
  isExpanded,
  pos,
  copiedLink,
  formatFileSize,
  onToggleExpand,
  onCopyLink,
  onDelete,
  onEdit,
  onToggleLinkStatus,
  onDragEnd,
}) => {
  const dragControls = useDragControls(); // لكل كارت كنترول خاص به
  const typeConfig = getDataTypeConfig(item.type);

  return (
    <motion.div
      key={item.id}
      layout
      drag
      dragControls={dragControls}
      dragListener={false} // السحب لا يبدأ إلا من الهاندل
      dragMomentum={false}
      dragConstraints={{ left: -1000, right: 1000, top: -1000, bottom: 1000 }}
      onDragEnd={(_, info) => onDragEnd(item.id, info.point.x, info.point.y)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="card p-2 hover:shadow-lg transition-shadow relative"
      style={{ width: isExpanded ? '350px' : '180px', x: pos.x, y: pos.y }}
    >
      {/* أيقونة Move (هاندل السحب) */}
      {!isExpanded && (
        <motion.div
          dragControls={dragControls}
          dragListener={true}
          className="w-4 h-4 absolute top-2 right-2 cursor-grab z-10"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <Move className="w-4 h-4 text-gray-500" />
        </motion.div>
      )}

      {/* محتوى الكارت */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={`w-10 h-10 rounded-lg ${typeConfig.color} flex items-center justify-center text-white text-lg flex-shrink-0 cursor-pointer`}
            onClick={() => onToggleExpand(item.id)}
            title="Show Info"
          >
            {typeConfig.icon}
          </motion.div>

          <div className="min-w-0 flex-1 text-center">
            <h3 className="font-semibold text-gray-800 truncate">
              {item.fileName || item.name || 'Untitled'}
            </h3>

            {isExpanded && (
              <div className="mt-2 space-y-1 text-sm text-gray-600 text-left">
                <p>ID: {item.name}</p>
                {item.description && <p>Description: {item.description}</p>}
                {item.fileName && (
                  <p>
                    File: {item.fileName} • {formatFileSize(item.fileSize)}
                  </p>
                )}
                <p>Created: {new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="flex flex-col items-center space-y-2 flex-shrink-0 ml-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onEdit(item)}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
              >
                <Edit className="w-4 h-4" />
              </button>

              <button
                onClick={() => onCopyLink(item)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                {copiedLink === item.nfcLink ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Link className="w-4 h-4" />
                )}
              </button>

              <button
                onClick={() => onDelete(item.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`w-14 h-6 rounded-full p-1 cursor-pointer flex items-center justify-between text-xs font-semibold ${
                isActive ? 'bg-green-400' : 'bg-gray-300'
              }`}
              onClick={() => onToggleLinkStatus(item.id)}
            >
              <span className="ml-1 text-white">ON</span>
              <span className="mr-1 text-white">OFF</span>
              <div
                className="w-5 h-5 bg-white rounded-full shadow-md transition-transform"
                style={{
                  transform: isActive ? 'translateX(28px)' : 'translateX(0)',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
/** ------------------------------------------------------------------------ **/

const DataManager: React.FC = () => {
  const { user } = useAuth();
  const { deviceId } = useDevice();
  const { showToast } = useToast();

  const [dataItems, setDataItems] = useState<DataItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<DataItem[]>([]);
  const [selectedType] = useState<DataType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<DataItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [linkStatus, setLinkStatus] = useState<Record<string, boolean>>({});
  const [draggedPositions, setDraggedPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  // تحميل البيانات من السيرفر
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    dataService
      .getDataItems(user.id)
      .then((items) => {
        setDataItems(items);
        const status: Record<string, boolean> = {};
        items.forEach((item) => (status[item.id] = true));
        setLinkStatus(status);
      })
      .catch(() =>
        showToast('error', 'Loading Error', 'Error loading your data.')
      )
      .finally(() => setLoading(false));
  }, [user]);

  // تصفية البيانات حسب البحث أو النوع
  useEffect(() => {
    let filtered = dataItems;
    if (selectedType !== 'all')
      filtered = filtered.filter((item) => item.type === selectedType);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.fileName && item.fileName.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q))
      );
    }
    setFilteredItems(filtered);
  }, [dataItems, selectedType, searchQuery]);

  // نسخ رابط NFC
  const copyNFCLink = async (item: DataItem) => {
    if (!linkStatus[item.id]) {
      showToast('error', 'Link Disabled', 'This NFC link is currently turned off');
      return;
    }
    try {
      await navigator.clipboard.writeText(item.nfcLink);
      setCopiedLink(item.nfcLink);
      showToast('success', 'Link Copied', 'NFC link copied to clipboard');
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      showToast('error', 'Copy Failed', 'Failed to copy link.');
    }
  };

  // حفظ تعديل بيانات
  const handleEditSave = async (updatedData: Partial<DataItem>, newFile?: File) => {
    if (!editingItem) return;
    try {
      const updatedItem = await dataService.updateDataItemWithFile(
        editingItem.id,
        updatedData,
        newFile
      );
      if (updatedItem) {
        setDataItems((prev) =>
          prev.map((it) => (it.id === editingItem.id ? updatedItem : it))
        );
        setEditingItem(null);
      }
    } catch {
      showToast('error', 'Update Failed', 'Failed to update data.');
    }
  };

  // حذف عنصر
  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const success = await dataService.deleteDataItem(id);
      if (success) setDataItems((prev) => prev.filter((it) => it.id !== id));
      showToast('success', 'Item Deleted', 'Data item deleted successfully.');
    } catch {
      showToast('error', 'Delete Failed', 'Failed to delete item.');
    }
  };

  // تحويل حجم الملف إلى نص
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
  };

  // هندلرز بسيطة علشان نمررها للكارت
  const onToggleExpand = (id: string) =>
    setExpandedItemId((prev) => (prev === id ? null : id));

  const onToggleLinkStatus = (id: string) =>
    setLinkStatus((prev) => ({ ...prev, [id]: !prev[id] }));

  const onCardDragEnd = (id: string, x: number, y: number) =>
    setDraggedPositions((prev) => ({ ...prev, [id]: { x, y } }));

  if (loading)
    return (
      <div className="flex items-center justify-center p-8 text-gray-600">
        Loading your data...
      </div>
    );

  return (
    <div className="space-y-8">
      {/* شريط البحث وإضافة عنصر */}
      <div className="flex items-center justify-between space-x-2 pr-4 pl-4">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg p-2"
        />
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-1 bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Data</span>
        </button>
      </div>

      {/* الأقسام حسب الكاتيجوري */}
      {CATEGORY_ORDER.map((category) => {
        const items = filteredItems.filter((it) => it.type === category);
        const hasItems = items.length > 0;

        return (
          <section key={category} className="space-y-3">
            {/* عنوان القسم */}
            <div className="flex items-center justify-between px-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {CATEGORY_LABELS[category]}
              </h2>
              <span className="text-sm text-gray-500">({items.length})</span>
            </div>

            {/* كروت القسم جنب بعض */}
            <div className="px-4">
              {hasItems ? (
                <div className="flex flex-wrap gap-3">
                  {items.map((item) => {
                    const isActive = linkStatus[item.id] ?? true;
                    const isExpanded = expandedItemId === item.id;
                    const pos = draggedPositions[item.id] || { x: 0, y: 0 };

                    return (
                      <DraggableCard
                        key={item.id}
                        item={item}
                        isActive={isActive}
                        isExpanded={isExpanded}
                        pos={pos}
                        copiedLink={copiedLink}
                        formatFileSize={formatFileSize}
                        onToggleExpand={onToggleExpand}
                        onCopyLink={copyNFCLink}
                        onDelete={deleteItem}
                        onEdit={setEditingItem}
                        onToggleLinkStatus={onToggleLinkStatus}
                        onDragEnd={onCardDragEnd}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-400 italic">No items in this category</div>
              )}
            </div>

            <hr className="border-gray-200 mt-2" />
          </section>
        );
      })}

      {/* نافذة تعديل البيانات */}
      {editingItem && (
        <EditDataModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          dataItem={editingItem}
          onSave={handleEditSave}
        />
      )}

      {/* نافذة إضافة عنصر جديد */}
      {showAddModal && (
        <EditDataModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          dataItem={{
            id: '',
            name: 'Untitled',
            type: DATA_TYPES[0].id,
            userId: user?.id || '',
            deviceId: deviceId || 'web',
            nfcLink: '',
            createdAt: new Date(),
            updatedAt: new Date(),
          }}
          onSave={async (data) => {
            if (!data.name) data.name = 'Untitled';
            if (!data.type) data.type = DATA_TYPES[0].id;
            if (!data.userId) data.userId = user?.id || '';

            try {
              const newItem = await dataService.addDataItem(data);
              setDataItems((prev) => [newItem, ...prev]);
              setShowAddModal(false);
              showToast('success', 'Item Added', 'Data item added successfully.');
            } catch (error) {
              console.error(error);
              showToast('error', 'Add Failed', 'Failed to add new data item.');
            }
          }}
        />
      )}
    </div>
  );
};

export default DataManager;
