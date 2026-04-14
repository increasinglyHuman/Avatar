"""
Export simplified Ruth2/Roth2 GLBs for Marvelous Designer.
Keeps: main body mesh + head + hands + feet + eyes + armature.
Strips: variant meshes (nail styles, foot heights, business body, etc.)
"""
import bpy
import sys
import os

args = sys.argv[sys.argv.index("--") + 1:]
input_path = args[0]
output_path = args[1]
avatar_type = args[2]  # "ruth2" or "roth2"

# Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Import GLB
bpy.ops.import_scene.gltf(filepath=input_path)

# Define which meshes to KEEP per avatar type
KEEP_MESHES = {
    "ruth2": {
        "Ruth2v4Body",
        "Ruth2v4Head",
        "Ruth2v4Hands",
        "Ruth2v4FeetFlat",
        "Ruth2v4EyeBall_L",
        "Ruth2v4Eyeball_R",
        "Ruth2v4Eyelashes",
    },
    "roth2": {
        "Roth2v2Body",
        "Roth2v2BentoHead",    # skinned head (NOT "headMesh" which is unskinned)
        "Roth2v2Hands",
        "Roth2v2Feet",
        "RotheyeBallLeftMesh",
        "RotheyeBallRightMesh",
    },
}

keep = KEEP_MESHES[avatar_type]
removed = []
kept = []

def base_name(name):
    """Strip Blender's .001/.002 suffixes for matching."""
    import re
    return re.sub(r'\.\d{3}$', '', name)

to_remove = []
for obj in list(bpy.data.objects):
    if obj.type == 'MESH':
        if base_name(obj.name) not in keep:
            to_remove.append(obj)
            removed.append(obj.name)
        else:
            kept.append(obj.name)
    elif obj.type == 'ARMATURE':
        kept.append(f"[ARMATURE] {obj.name}")
    elif obj.type == 'EMPTY':
        pass
    else:
        to_remove.append(obj)
        removed.append(f"[{obj.type}] {obj.name}")

for obj in to_remove:
    bpy.data.objects.remove(obj, do_unlink=True)

# Clean up orphaned data
bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)

# Export GLB
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    export_animations=False,
    export_skins=True,
    export_morph=True,
    export_apply=False,
    export_yup=True,
)

file_size = os.path.getsize(output_path)
print(f"\n{'='*60}")
print(f"EXPORTED: {output_path}")
print(f"SIZE: {file_size / 1024 / 1024:.1f} MB")
print(f"KEPT: {kept}")
print(f"REMOVED: {removed}")
print(f"{'='*60}\n")
