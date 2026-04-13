"""
Export simplified Ruth2/Roth2 DAE files for Marvelous Designer.
Same mesh selection as simplify_avatar_glb.py but exports Collada (.dae).
"""
import bpy
import sys
import os
import re

args = sys.argv[sys.argv.index("--") + 1:]
input_path = args[0]
output_path = args[1]
avatar_type = args[2]  # "ruth2" or "roth2"

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Import GLB (source of truth for simplified mesh)
bpy.ops.import_scene.gltf(filepath=input_path)

KEEP_MESHES = {
    "ruth2": {
        "Ruth2v4Body", "Ruth2v4Head", "Ruth2v4Hands",
        "Ruth2v4FeetFlat", "Ruth2v4EyeBall_L", "Ruth2v4Eyeball_R",
        "Ruth2v4Eyelashes",
    },
    "roth2": {
        "Roth2v2Body", "headMesh", "Roth2v2Hands",
        "Roth2v2Feet", "RotheyeBallLeftMesh", "RotheyeBallRightMesh",
    },
}

def base_name(name):
    return re.sub(r'\.\d{3}$', '', name)

keep = KEEP_MESHES[avatar_type]
to_remove = []
kept = []
removed = []

for obj in list(bpy.data.objects):
    if obj.type == 'MESH':
        if base_name(obj.name) not in keep:
            to_remove.append(obj)
            removed.append(obj.name)
        else:
            kept.append(obj.name)
    elif obj.type == 'ARMATURE':
        kept.append(f"[ARMATURE] {obj.name}")
    elif obj.type not in ('EMPTY',):
        to_remove.append(obj)
        removed.append(f"[{obj.type}] {obj.name}")

for obj in to_remove:
    bpy.data.objects.remove(obj, do_unlink=True)

bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)

# Export DAE (Collada)
bpy.ops.wm.collada_export(
    filepath=output_path,
    apply_modifiers=False,
    export_mesh_type_selection='render',
    selected=False,
    include_armatures=True,
    include_children=True,
    deform_bones_only=False,
)

file_size = os.path.getsize(output_path)
print(f"\n{'='*60}")
print(f"EXPORTED DAE: {output_path}")
print(f"SIZE: {file_size / 1024 / 1024:.1f} MB")
print(f"KEPT: {kept}")
print(f"REMOVED: {removed}")
print(f"{'='*60}\n")
