import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';
import { dataService } from '../services/dataService';
import { DataItem, DataType } from '../types';
import { DATA_TYPES, getDataTypeConfig } from '../config/dataTypes';
import { Plus, Edit, Trash2, Link, Check, Move } from 'lucide-react';
import EditDataModal from './EditDataModal';
import { useToast } from '../hooks/useToast';

const CATEGORY_ORDER: Array<DataType | 'other'> = [
  'id_card',
  'license',
  'photo',
  'document',
  'other',
];

const CATEGORY_LABELS: Record<string, string> = {
  'id_card': 'ID Cards',
  'license': 'License',
  'photo': 'Photos',
  'document': 'Documents',
  'other': 'Others',
};

const CARD_WIDTH = 180;
const CARD_HEIGHT = 60;

type Position = { x: number; y: number };

type BlockEnd = {
  id: 'block-end';
  name: 'Block';
  type: DataType;
  userId: string;
  deviceId: string;
  nfcLink: string;
  createdAt: Date;
  updatedAt: Date;
};

type CardOrBlock = DataItem | BlockEnd;

type DraggableCardProps = {
  item: DataItem;
  isActive: boolean;
  isExpanded: boolean;
  pos: Position;
  index: number;
  siblings: CardOrBlock[];
  onSwap: (fromIndex: number, toIndex: number) => void;
  copiedLink: string | null;
  formatFileSize: (bytes?: number) => string;
  onToggleExpand: (id: string) => void;
  onCopyLink: (item: DataItem) => void;
  onDelete: (id: string) => void;
  onEdit: (item: DataItem) => void;
  onToggleLinkStatus: (id: string, newStatus: boolean) => Promise<void>;
};

const DraggableCard: React.FC<DraggableCardProps> = ({
  item,
  isActive,
  isExpanded,
  pos,
  index,
  siblings,
  onSwap,
  copiedLink,
  formatFileSize,
  onToggleExpand,
  onCopyLink,
  onDelete,
  onEdit,
  onToggleLinkStatus,
}) => {
  const dragControls = useDragControls();
  const typeConfig = getDataTypeConfig(item.type);
  const ref = useRef<HTMLDivElement>(null);
  const [dragConstraints, setDragConstraints] = useState({ left: 0, right: 0, top: 0, bottom: 0 });

  const calculateConstraints = () => {
    const cardEl = ref.current;
    const containerEl = cardEl?.parentElement;
    if (!cardEl || !containerEl) return;

    const blockEl = containerEl.querySelector<HTMLDivElement>('[data-is-block="true"]');
    
    const cardRect = cardEl.getBoundingClientRect();
    const containerRect = containerEl.getBoundingClientRect();
    
    const left = containerRect.left - cardRect.left;
    
    let right = 0;
    if (blockEl) {
        right = blockEl.getBoundingClientRect().left - cardRect.right;
    }

    setDragConstraints({ left, right, top: 0, bottom: 0 });
  };

  const handleDrag = useCallback(
    (_event: any, info: any) => {
      const currentRect = ref.current?.getBoundingClientRect();
      if (!currentRect) return;

      const movingRight = info.delta.x > 0;
      const movingLeft = info.delta.x < 0;

      siblings.forEach((sib, sibIndex) => {
        if (sib.id === item.id || sib.id === 'block-end') {
          return;
        }

        const sibEl = document.getElementById(`card-${sib.id}`);
        if (!sibEl) return;
        const rect = sibEl.getBoundingClientRect();

        let isSwapping = false;

        if (movingRight && (currentRect.left + currentRect.width / 2) > (rect.left + rect.width / 2) && index < sibIndex) {
          isSwapping = true;
        }

        if (movingLeft && (currentRect.left + currentRect.width / 2) < (rect.left + rect.width / 2) && index > sibIndex) {
          isSwapping = true;
        }

        if (isSwapping) {
          onSwap(index, sibIndex);
        }
      });
    },
    [index, siblings, item.id, onSwap]
  );
  
  return (
    <motion.div
      id={`card-${item.id}`}
      ref={ref}
      layout
      drag="x"
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      onDrag={handleDrag}
      dragConstraints={dragConstraints}
      onDragStart={calculateConstraints}
      style={{
        width: isExpanded ? 400 : CARD_WIDTH,
        height: isExpanded ? 210 : CARD_HEIGHT,
        x: pos.x,
        y: pos.y,
        zIndex: 100,
        userSelect: 'none',
      }}
      initial={{ opacity: 0, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 0 }}
      className="card p-2 hover:shadow-lg transition-shadow relative bg-white rounded-lg"
    >
      {!isExpanded && (
        <motion.div
          dragControls={dragControls}
          dragListener={true}
          className="w-4 h-4 absolute top-2 right-2 cursor-grab z-20"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <Move className="w-4 h-4 text-gray-500" />
        </motion.div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 3 }}
            className={`w-10 h-10 rounded-lg ${typeConfig.color} flex items-center justify-center text-white text-lg flex-shrink-0 cursor-pointer`}
            onClick={() => onToggleExpand(item.id)}
            title="Show Info"
          >
            {typeConfig.icon}
          </motion.div>
          <div className="min-w-0 flex-1 text-left">
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
              <button onClick={() => onEdit(item)} className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => onCopyLink(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                {copiedLink === item.nfcLink ? <Check className="w-4 h-4 text-green-600" /> : <Link className="w-4 h-4" />}
              </button>
              <button onClick={() => onDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`w-14 h-6 rounded-full p-1 cursor-pointer flex items-center justify-between text-xs font-semibold ${
                isActive ? 'bg-green-400' : 'bg-gray-300'
              }`}
              onClick={() => onToggleLinkStatus(item.id, !isActive)}
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

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    dataService
      .getDataItems(user.id)
      .then((items) => {
        setDataItems(items);
        const status: Record<string, boolean> = {};
        items.forEach((item) => (status[item.id] = item.isPublic ?? true));
        setLinkStatus(status);
      })
      .catch(() => showToast('error', 'Loading Error', 'Error loading your data.'))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    let filtered = dataItems;
    if (selectedType !== 'all') filtered = filtered.filter((item) => item.type === selectedType);
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

  const handleEditSave = async (updatedData: Partial<DataItem>, newFile?: File) => {
    if (!editingItem) return;
    try {
      const updatedItem = await dataService.updateDataItem(editingItem.id, updatedData, newFile);
      if (updatedItem) {
        setDataItems((prev) => prev.map((it) => (it.id === editingItem.id ? updatedItem : it)));
        setEditingItem(null);
      }
    } catch {
      showToast('error', 'Update Failed', 'Failed to update data.');
    }
  };

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

  const copyNFCLink = async (item: DataItem) => {
    // NEW: The user wants to be able to copy the link even when it's off.
    // The check for `linkStatus[item.id]` is removed.
    try {
      await navigator.clipboard.writeText(item.nfcLink);
      setCopiedLink(item.nfcLink);
      showToast('success', 'Link Copied', 'NFC link copied to clipboard');
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      showToast('error', 'Copy Failed', 'Failed to copy link.');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
  };

  const onToggleExpand = (id: string) => setExpandedItemId((prev) => (prev === id ? null : id));
  
  const onToggleLinkStatus = async (id: string, newStatus: boolean) => {
    const originalStatus = linkStatus[id];
    setLinkStatus((prev) => ({ ...prev, [id]: newStatus }));
    try {
      await dataService.updateLinkStatus(id, newStatus);
      showToast('success', 'Link Status Updated', `The NFC link is now ${newStatus ? 'active' : 'inactive'}.`);
    } catch (error) {
      showToast('error', 'Update Failed', 'Failed to update link status. Please try again.');
      setLinkStatus((prev) => ({ ...prev, [id]: originalStatus }));
    }
  };

  const handleSwap = (fromId: string, toId: string) => {
    setDataItems((prev) => {
      const fromIndex = prev.findIndex((item) => item.id === fromId);
      const toIndex = prev.findIndex((item) => item.id === toId);

      if (fromIndex === -1 || toIndex === -1) {
        return prev;
      }

      const newItems = [...prev];
      const temp = newItems[fromIndex];
      newItems[fromIndex] = newItems[toIndex];
      newItems[toIndex] = temp;
      
      return newItems;
    });
  };

  if (loading) return <div className="flex items-center justify-center p-8 text-gray-600">Loading your data...</div>;

  return (
    <div className="space-y-8">
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

      {CATEGORY_ORDER.map((category) => {
        const items = filteredItems.filter((it) => it.type === category);
        const hasItems = items.length > 0;

        const itemsWithBlock: CardOrBlock[] = [
          ...items,
          {
            id: 'block-end',
            name: 'Block',
            type: 'other' as DataType,
            userId: '',
            deviceId: '',
            nfcLink: '',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        return (
          <section key={category} className="space-y-3">
            <div className="flex items-center justify-between px-4">
              <h2 className="text-lg font-semibold text-gray-800">{CATEGORY_LABELS[category]}</h2>
              <span className="text-sm text-gray-500">({items.length})</span>
            </div>

            <div className="px-4">
              {hasItems ? (
                <div className="flex flex-row gap-3 overflow-x-auto py-2">
                  {itemsWithBlock.map((item, index) => {
                    if (item.id === 'block-end') {
                      return (
                        <div
                          key="block-end"
                          data-is-block="true"
                          style={{
                            width: '1000px',
                            height: CARD_HEIGHT,
                            minWidth: '1000px',
                            marginTop: '-32px',
                            opacity: 0,
                          }}
                          className="bg-gray-200 rounded-lg flex-shrink-0 flex items-center justify-center text-gray-400 text-sm"
                        >
                          Block
                        </div>
                      );
                    }

                    const isActive = linkStatus[item.id] ?? true;
                    const isExpanded = expandedItemId === item.id;
                    const pos = { x: 0, y: 0 };

                    return (
                      <DraggableCard
                        key={item.id}
                        item={item}
                        isActive={isActive}
                        isExpanded={isExpanded}
                        pos={pos}
                        index={index}
                        siblings={itemsWithBlock}
                        copiedLink={copiedLink}
                        formatFileSize={formatFileSize}
                        onToggleExpand={onToggleExpand}
                        onCopyLink={copyNFCLink}
                        onDelete={deleteItem}
                        onEdit={setEditingItem}
                        onToggleLinkStatus={onToggleLinkStatus}
                        onSwap={(from, to) => {
                          const fromItem = itemsWithBlock[from];
                          const toItem = itemsWithBlock[to];
                          
                          if (fromItem?.id && toItem?.id && toItem.id !== 'block-end') {
                            handleSwap(fromItem.id, toItem.id);
                          }
                        }}
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

      {editingItem && (
        <EditDataModal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          dataItem={editingItem}
          onSave={handleEditSave}
        />
      )}

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
              console.error('Error adding new data item:', error);
              let errorMessage = 'Failed to add new data item.';
              if (error && typeof error === 'object' && 'message' in error) {
                errorMessage = `Add Failed: ${error.message}`;
              }
              showToast('error', 'Add Failed', errorMessage);
            }
          }}
        />
      )}
    </div>
  );
};

export default DataManager;