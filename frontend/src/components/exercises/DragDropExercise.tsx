import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DragDropItem {
  id: string;
  content: string;
  category: string;
}

interface DropZone {
  id: string;
  label: string;
  accepts: string[];
  items: DragDropItem[];
}

interface DragDropExerciseProps {
  question: string;
  items: DragDropItem[];
  zones: DropZone[];
  onComplete: (isCorrect: boolean) => void;
}

const DragDropExercise: React.FC<DragDropExerciseProps> = ({
  question,
  items,
  zones,
  onComplete
}) => {
  const [draggedItem, setDraggedItem] = useState<DragDropItem | null>(null);
  const [dropZones, setDropZones] = useState<DropZone[]>(zones.map(zone => ({ ...zone, items: [] })));
  const [availableItems, setAvailableItems] = useState<DragDropItem[]>(items);
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, item: DragDropItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    setDragOverZone(zoneId);
  };

  const handleDragLeave = () => {
    setDragOverZone(null);
  };

  const handleDrop = (e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    const zone = dropZones.find(z => z.id === zoneId);
    if (!zone || !zone.accepts.includes(draggedItem.category)) {
      setDragOverZone(null);
      setDraggedItem(null);
      return;
    }

    // Ajouter l'item à la zone
    setDropZones(prev => prev.map(z => 
      z.id === zoneId 
        ? { ...z, items: [...z.items, draggedItem] }
        : z
    ));

    // Retirer l'item de la liste disponible
    setAvailableItems(prev => prev.filter(item => item.id !== draggedItem.id));

    setDragOverZone(null);
    setDraggedItem(null);

    // Vérifier si l'exercice est complet
    checkCompletion();
  };

  const checkCompletion = () => {
    const allItemsPlaced = availableItems.length === 0;
    if (allItemsPlaced) {
      // Vérifier si toutes les zones ont les bons items
      const isCorrect = dropZones.every(zone => {
        const expectedItems = items.filter(item => zone.accepts.includes(item.category));
        return zone.items.length === expectedItems.length;
      });
      
      onComplete(isCorrect);
    }
  };

  const resetExercise = () => {
    setDropZones(zones.map(zone => ({ ...zone, items: [] })));
    setAvailableItems(items);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-center text-gray-800 mb-6">
        {question}
      </h3>

      {/* Items disponibles */}
      <div className="bg-white/80 rounded-xl p-4">
        <h4 className="text-lg font-semibold mb-4 text-gray-700">Glisse les éléments :</h4>
        <div className="grid grid-cols-2 gap-3">
          <AnimatePresence>
            {availableItems.map((item, index) => (
              <div
                key={item.id}
                className="bg-gradient-to-r from-blue-400 to-purple-500 text-white p-3 rounded-lg cursor-move shadow-lg border-2 border-white/50 hover:scale-105 transition-transform"
                draggable
                onDragStart={(e: React.DragEvent) => handleDragStart(e, item)}
              >
                {item.content}
              </div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Zones de drop */}
      <div className="grid grid-cols-2 gap-4">
        {dropZones.map((zone) => (
          <div
            key={zone.id}
            className={`
              min-h-32 p-4 rounded-xl border-2 border-dashed transition-all duration-300 hover:scale-105
              ${dragOverZone === zone.id 
                ? 'border-purple-500 bg-purple-100/50' 
                : 'border-gray-300 bg-white/60'
              }
            `}
            onDragOver={(e: React.DragEvent) => handleDragOver(e, zone.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e: React.DragEvent) => handleDrop(e, zone.id)}
          >
            <h5 className="font-semibold text-gray-700 mb-2">{zone.label}</h5>
            
            {/* Items dans la zone */}
            <div className="space-y-2">
              {zone.items.map((item, index) => (
                <motion.div
                  key={item.id}
                  className="bg-gradient-to-r from-green-400 to-blue-500 text-white p-2 rounded-lg shadow-md"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {item.content}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bouton reset */}
      <div className="text-center">
        <motion.button
          onClick={resetExercise}
          className="bg-gradient-to-r from-orange-400 to-red-500 text-white px-6 py-2 rounded-lg font-semibold shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          🔄 Recommencer
        </motion.button>
      </div>
    </div>
  );
};

export default DragDropExercise; 